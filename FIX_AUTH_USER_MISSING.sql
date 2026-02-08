-- =====================================================
-- FIX USER AUTHENTICATION - CREATE MISSING AUTH USERS
-- =====================================================
-- This creates auth.users entries for users that only exist in users table
-- =====================================================

-- STEP 1: Check which users are missing from auth.users
SELECT 
  u.id,
  u.email,
  u.username,
  u.display_name,
  u.role,
  CASE 
    WHEN au.id IS NULL THEN '❌ No auth user - Cannot login'
    ELSE '✅ Auth user exists - Can login'
  END as auth_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at DESC;

-- =====================================================
-- IMPORTANT: You cannot manually insert into auth.users
-- =====================================================
-- Supabase's auth.users table is managed by the auth system.
-- You MUST use one of these methods:
--
-- METHOD 1: Use the app's Create User feature (RECOMMENDED)
--   - Go to http://localhost:3001/users
--   - Click "Create New User"
--   - Enter username, password, display name, role
--   - This creates both users and auth.users entries
--
-- METHOD 2: Use Supabase Dashboard
--   - Go to Authentication → Users
--   - Click "Add User"
--   - Enter email and password
--   - Then update the users table with the correct username
--
-- METHOD 3: Delete and recreate via app
--   - Delete the user from users table
--   - Use app to create user properly

-- =====================================================
-- OPTION: Delete users that have no auth entry
-- =====================================================
-- WARNING: This will delete users that cannot login
-- Only run this if you want to clean up and recreate them

-- First, see which users will be deleted:
SELECT 
  u.id,
  u.email,
  u.username,
  u.display_name,
  u.role
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;

-- If you want to delete them (BE CAREFUL):
-- DELETE FROM users u
-- WHERE NOT EXISTS (
--   SELECT 1 FROM auth.users au WHERE au.id = u.id
-- );

-- =====================================================
-- FIX FOR YOUR SPECIFIC USER: abshana03
-- =====================================================
-- Since the user was created manually in users table,
-- you need to delete it and recreate it properly via the app

-- STEP 1: Delete the incomplete user from users table
DELETE FROM users 
WHERE username = 'abshana03' 
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = users.id);

-- STEP 2: Now create the user via the app at /users
-- Username: abshana03
-- Password: (choose a password)
-- Display Name: Admin
-- Role: admin

-- =====================================================
-- VERIFICATION AFTER RECREATION
-- =====================================================
-- Run this to verify user was created correctly:
SELECT 
  u.id,
  u.username,
  u.email as users_email,
  au.email as auth_email,
  u.display_name,
  u.role,
  au.email_confirmed_at,
  CASE 
    WHEN au.id IS NOT NULL AND au.email_confirmed_at IS NOT NULL THEN '✅ Ready to login'
    WHEN au.id IS NOT NULL AND au.email_confirmed_at IS NULL THEN '⚠️ Email not confirmed'
    ELSE '❌ No auth user'
  END as status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.username = 'abshana03'
ORDER BY u.created_at DESC;
