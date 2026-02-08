-- =====================================================
-- CHECK USER: abshana03
-- =====================================================
-- This will help diagnose why you can't login with abshana03
-- =====================================================

-- =====================================================
-- STEP 1: Check if user exists in users table
-- =====================================================
SELECT 
  u.id,
  u.username,
  u.email,
  u.display_name,
  u.role,
  u.created_at,
  CASE 
    WHEN u.username IS NOT NULL THEN '✅ Username exists'
    ELSE '❌ No username'
  END as username_status
FROM users u
WHERE u.username = 'abshana03';

-- Expected: Should show 1 row if user exists
-- If empty: User doesn't exist in users table
-- =====================================================


-- =====================================================
-- STEP 2: Check if user exists in auth.users table
-- =====================================================
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.confirmed_at,
  au.created_at,
  au.last_sign_in_at,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Email confirmed'
    ELSE '❌ Email not confirmed'
  END as email_status
FROM auth.users au
WHERE au.email = 'abshana03@crunchy-times.local'
   OR au.email LIKE '%abshana03%';

-- Expected: Should show 1 row if auth user exists
-- If empty: User doesn't exist in auth.users table
-- =====================================================


-- =====================================================
-- STEP 3: Check both tables together
-- =====================================================
SELECT 
  u.id as users_id,
  u.username,
  u.email as users_email,
  u.role,
  au.id as auth_id,
  au.email as auth_email,
  au.email_confirmed_at,
  CASE 
    WHEN u.id IS NOT NULL AND au.id IS NOT NULL AND au.email_confirmed_at IS NOT NULL 
      THEN '✅ READY TO LOGIN'
    WHEN u.id IS NOT NULL AND au.id IS NOT NULL AND au.email_confirmed_at IS NULL 
      THEN '⚠️ Email not confirmed - Cannot login'
    WHEN u.id IS NOT NULL AND au.id IS NULL 
      THEN '❌ No auth user - Cannot login (need to recreate via app)'
    WHEN u.id IS NULL AND au.id IS NOT NULL 
      THEN '❌ No users entry - Auth user orphaned'
    ELSE '❌ User does not exist'
  END as status
FROM users u
FULL OUTER JOIN auth.users au ON u.id = au.id
WHERE u.username = 'abshana03' 
   OR au.email = 'abshana03@crunchy-times.local'
   OR au.email LIKE '%abshana03%';

-- =====================================================


-- =====================================================
-- STEP 4: Check all users to see what exists
-- =====================================================
SELECT 
  u.username,
  u.email as users_email,
  u.role,
  au.email as auth_email,
  au.email_confirmed_at,
  CASE 
    WHEN au.id IS NOT NULL AND au.email_confirmed_at IS NOT NULL THEN '✅ Can login'
    WHEN au.id IS NOT NULL AND au.email_confirmed_at IS NULL THEN '⚠️ Email not confirmed'
    ELSE '❌ Cannot login'
  END as login_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at DESC;

-- This shows ALL users in your system
-- =====================================================


-- =====================================================
-- DIAGNOSIS & SOLUTIONS
-- =====================================================

-- ❌ PROBLEM 1: User doesn't exist at all
-- SOLUTION: Create user via app at /users
-- Username: abshana03
-- Password: (choose a password)
-- Display Name: Admin
-- Role: admin

-- ❌ PROBLEM 2: User exists in users table but not in auth.users
-- SOLUTION: Delete from users table and recreate via app
-- DELETE FROM users WHERE username = 'abshana03';
-- Then create via app at /users

-- ❌ PROBLEM 3: Email not confirmed
-- SOLUTION: Manually confirm the email
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW()
-- WHERE email = 'abshana03@crunchy-times.local';

-- ❌ PROBLEM 4: Wrong password
-- SOLUTION: Reset password via admin panel at /users
-- Or use Supabase Dashboard → Authentication → Users → Reset Password

-- ❌ PROBLEM 5: User was deleted during reset
-- SOLUTION: If you ran RESET_ALL_DATA.sql and abshana03 was a staff user,
-- it would have been deleted. You need to recreate it via /users

-- =====================================================
-- QUICK FIX: Recreate abshana03 user
-- =====================================================

-- First, check if user exists and delete if incomplete:
DELETE FROM users 
WHERE username = 'abshana03' 
  AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = users.id);

-- Verify deletion:
SELECT COUNT(*) as deleted_count FROM users WHERE username = 'abshana03';
-- Expected: 0

-- Now go to the app and create user:
-- 1. Login with your admin account
-- 2. Go to http://localhost:3001/users
-- 3. Click "Create New User"
-- 4. Fill in:
--    Username: abshana03
--    Password: (your password)
--    Display Name: Abshana
--    Role: admin or staff (your choice)
-- 5. Click "Create User"
-- 6. Try logging in with: abshana03

-- =====================================================
