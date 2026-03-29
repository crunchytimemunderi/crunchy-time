-- ============================================================
-- Migration: Custom JWT Claims for User Roles
-- Run this in the Supabase SQL Editor to enable zero-latency
-- role checks in Next.js Middleware.
-- ============================================================

-- 1. Create the hook function that adds `role` to JWT claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- Fetch the user's role from the public.users table
  SELECT role
    INTO user_role
    FROM public.users
   WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    -- Attach role to app_metadata so it's available in the JWT
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  END IF;

  -- Return the modified event with updated claims
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- 2. Grant execute permission to the hook's invoker roles
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- ============================================================
-- IMPORTANT: After running this SQL, you must also enable the
-- hook in the Supabase Dashboard:
--
--   Authentication → Hooks → Custom Access Token Hook
--   → Enable → Select function: public.custom_access_token_hook
-- ============================================================
