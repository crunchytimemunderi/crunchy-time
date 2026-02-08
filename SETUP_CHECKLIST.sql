-- =====================================================
-- COMPLETE SETUP CHECKLIST FOR USERNAME-BASED AUTH
-- =====================================================
-- Run these SQL scripts in order to complete the setup
-- =====================================================

-- STEP 1: Add username field (if not already done)
-- Run: ADD_USERNAME_FIELD.sql

-- STEP 2: Fix RLS policies (if not already done)
-- Run: FIX_USERS_RLS_EMERGENCY.sql

-- STEP 3: Add custom permissions column (if not already done)
-- Run: ADD_CUSTOM_PERMISSIONS.sql

-- STEP 4: Disable email confirmations
-- Method A: Dashboard (RECOMMENDED)
--   Go to: Supabase Dashboard → Authentication → Settings → Email Auth
--   UNCHECK: "Enable email confirmations"
--   Click: Save
-- Method B: Confirm existing users manually
--   Run: FIX_EMAIL_RATE_LIMIT.sql (lines 18-26)

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- 1. Check if username column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check all users have usernames
SELECT 
  id,
  username,
  email,
  display_name,
  role,
  CASE 
    WHEN username IS NULL THEN '❌ Missing username'
    ELSE '✅ Has username'
  END as username_status
FROM users
ORDER BY created_at DESC;

-- 3. Check email confirmation status
SELECT 
  id,
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '❌ Not Confirmed'
  END as status
FROM auth.users
ORDER BY created_at DESC;

-- 4. Check RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 5. Check is_admin function exists
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_admin';

-- =====================================================
-- QUICK FIXES
-- =====================================================

-- Fix 1: If users are missing usernames
UPDATE users 
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL OR username = '';

-- Fix 2: Confirm all users (if email confirmation enabled)
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Fix 3: Test a specific user can login
SELECT 
  u.id,
  u.username,
  u.email,
  u.display_name,
  u.role,
  au.email_confirmed_at,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Can login'
    ELSE '❌ Cannot login - email not confirmed'
  END as login_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.username = 'YOUR_USERNAME_HERE'; -- Replace with actual username

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- Issue: "Email rate limit exceeded"
-- Solution: Disable email confirmations in Supabase Dashboard
-- See: FIX_EMAIL_RATE_LIMIT.sql

-- Issue: "Row Level Security policy violation"
-- Solution: Run FIX_USERS_RLS_EMERGENCY.sql
-- This creates the is_admin() function with SECURITY DEFINER

-- Issue: "Invalid login credentials"
-- Possible causes:
--   1. Username doesn't exist - Check users table
--   2. Email not confirmed - Run UPDATE auth.users SET email_confirmed_at = NOW()
--   3. Wrong password - Reset via admin panel

-- Issue: User exists but can't login
-- Check this query:
SELECT 
  u.username,
  au.email,
  au.email_confirmed_at,
  au.last_sign_in_at
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE u.username = 'YOUR_USERNAME_HERE';

-- If email_confirmed_at is NULL, run:
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = (SELECT email FROM users WHERE username = 'YOUR_USERNAME_HERE');

-- =====================================================
-- POST-SETUP TEST
-- =====================================================

-- 1. Create a test user via the app
--    Username: testuser
--    Password: test123
--    Role: staff

-- 2. Verify test user was created correctly:
SELECT 
  u.id,
  u.username,
  u.email,
  u.display_name,
  u.role,
  au.email_confirmed_at,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Ready to login'
    ELSE '❌ Email not confirmed'
  END as status
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE u.username = 'testuser';

-- 3. Try logging in with:
--    Username: testuser
--    Password: test123

-- 4. Clean up test user (optional):
-- DELETE FROM users WHERE username = 'testuser';
-- DELETE FROM auth.users WHERE email = 'testuser@crunchy-times.local';
