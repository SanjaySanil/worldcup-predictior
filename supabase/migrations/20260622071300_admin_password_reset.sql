-- =========================================================================
-- Admin Password Reset System Migration
-- Adds reset_code and reset_requested to profiles.
-- Creates SECURITY DEFINER functions to securely request and perform
-- password resets without requiring SMTP/email server setup.
-- =========================================================================

-- 1. Add reset columns to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reset_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reset_requested BOOLEAN DEFAULT false;

-- 2. Create the request function (called anonymously)
-- Generates a secure random 6-digit code and stores it on the user's profile.
-- Does not return the code to the caller (admin must retrieve it from DB).
CREATE OR REPLACE FUNCTION public.request_password_reset(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_user_exists BOOLEAN;
BEGIN
  -- Normalize username to lowercase
  p_username := lower(trim(p_username));

  -- Check if username exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = p_username) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User with username "%" not found', p_username;
  END IF;

  -- Generate a 6-digit random code (e.g. 100000 to 999999)
  v_code := floor(random() * 900000 + 100000)::TEXT;

  -- Save the code and set reset flag
  UPDATE public.profiles
  SET reset_code = v_code,
      reset_requested = true
  WHERE username = p_username;

  RETURN TRUE;
END;
$$;

-- 3. Create the reset function (called anonymously with the admin code)
-- Verifies the code and updates the auth.users table password.
CREATE OR REPLACE FUNCTION public.reset_user_password_by_code(
  p_username TEXT,
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
  p_username := lower(trim(p_username));
  p_code := trim(p_code);

  -- Retrieve matching profile id
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE username = p_username
    AND reset_requested = true
    AND reset_code = p_code;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Incorrect username or reset code';
  END IF;

  -- Update the password hash in Supabase's auth.users table using pgcrypto's crypt
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf', 10))
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
