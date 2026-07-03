-- =========================================================================
-- Admin Password Reset System Migration
-- Adds reset_code and reset_requested to profiles.
-- Creates SECURITY DEFINER functions to securely request and perform
-- password resets without requiring SMTP/email server setup.
-- Supports lookup by either username or email address.
-- =========================================================================

-- 1. Add reset columns to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reset_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reset_requested BOOLEAN DEFAULT false;

-- Drop old functions first (prevents parameter name change errors in Postgres)
DROP FUNCTION IF EXISTS public.request_password_reset(text);
DROP FUNCTION IF EXISTS public.reset_user_password_by_code(text, text, text);

-- 2. Create the request function (called anonymously)
-- Generates a secure random 6-digit code and stores it on the user's profile.
-- Does not return the code to the caller (admin must retrieve it from DB).
CREATE OR REPLACE FUNCTION public.request_password_reset(p_username_or_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_user_id UUID;
BEGIN
  -- Normalize input
  p_username_or_email := lower(trim(p_username_or_email));

  -- Check if user exists by username or email
  SELECT p.id INTO v_user_id
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.username = p_username_or_email OR u.email = p_username_or_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with username or email "%" not found', p_username_or_email;
  END IF;

  -- Generate a 6-digit random code (e.g. 100000 to 999999)
  v_code := floor(random() * 900000 + 100000)::TEXT;

  -- Save the code and set reset flag
  UPDATE public.profiles
  SET reset_code = v_code,
      reset_requested = true
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$;

-- 3. Create the reset function (called anonymously with the admin code)
-- Verifies the code and updates the auth.users table password.
CREATE OR REPLACE FUNCTION public.reset_user_password_by_code(
  p_username_or_email TEXT,
  p_code TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Normalize inputs
  p_username_or_email := lower(trim(p_username_or_email));
  p_code := trim(p_code);

  -- Retrieve matching profile id by username or email
  SELECT p.id INTO v_user_id
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE (p.username = p_username_or_email OR u.email = p_username_or_email)
    AND p.reset_requested = true
    AND p.reset_code = p_code;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Incorrect username/email or reset code';
  END IF;

  -- Update the password hash in Supabase's auth.users table using pgcrypto's crypt
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10))
  WHERE id = v_user_id;

  -- Clear the reset state on success
  UPDATE public.profiles
  SET reset_code = NULL,
      reset_requested = false
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$;

-- 4. Grant execution rights to anon & authenticated users
GRANT EXECUTE ON FUNCTION public.request_password_reset(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_password_by_code(TEXT, TEXT, TEXT) TO anon, authenticated;
