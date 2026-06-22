
-- Drop and recreate the trigger function with proper RLS bypass and error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_role TEXT;
BEGIN
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  );
  v_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  );
  v_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'role', ''),
    'user'
  );

  -- Validate role value
  IF v_role NOT IN ('super_admin', 'admin', 'user') THEN
    v_role := 'user';
  END IF;

  INSERT INTO profiles (id, username, display_name, role)
  VALUES (NEW.id, v_username, v_display_name, v_role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  -- Username taken — append short unique suffix
  INSERT INTO profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    v_username || '_' || substr(replace(NEW.id::text, '-', ''), 1, 6),
    v_display_name,
    v_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user: % (SQLSTATE %)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Grant execute to the auth admin role that runs the trigger
GRANT EXECUTE ON FUNCTION handle_new_user() TO supabase_auth_admin;

-- Ensure the auth admin role can INSERT into profiles directly
-- (fallback in case SECURITY DEFINER doesn't fully bypass in this Supabase version)
GRANT INSERT, SELECT, UPDATE ON TABLE profiles TO supabase_auth_admin;
