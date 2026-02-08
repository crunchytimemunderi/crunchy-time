-- =====================================================
-- COMPREHENSIVE FIX FOR abshana03 - Reset Password
-- =====================================================
-- This will reset the password so you can login
-- =====================================================

-- =====================================================
-- STEP 1: Find the exact user details
-- =====================================================
SELECT 
  u.id,
  u.username,
  u.email as users_email,
  u.display_name,
  u.role,
  au.id as auth_id,
  au.email as auth_email,
  au.email_confirmed_at,
  au.last_sign_in_at
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.username = 'abshana03';

-- Copy the 'id' from the result above
-- =====================================================


-- =====================================================
-- STEP 2: Check if there are orphaned auth.users
-- =====================================================
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.created_at,
  '❌ Orphaned - no matching users entry' as status
FROM auth.users au
WHERE au.email LIKE '%abshana03%'
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = au.id);

-- If this shows any rows, delete them:
DELETE FROM auth.users
WHERE email LIKE '%abshana03%'
  AND NOT EXISTS (SELECT 1 FROM users WHERE id = auth.users.id);
-- =====================================================


-- =====================================================
-- STEP 3: NUCLEAR OPTION - Delete and recreate completely
-- =====================================================
-- Run this to completely remove abshana03 from both tables

-- Delete from users table
DELETE FROM users WHERE username = 'abshana03';

-- Delete from auth.users (find the exact email first)
DELETE FROM auth.users WHERE email = 'abshana03@crunchy-times.local';

-- Also check for variations
DELETE FROM auth.users WHERE email LIKE '%abshana03%';

-- Verify both tables are clean:
SELECT COUNT(*) as users_count FROM users WHERE username = 'abshana03';
SELECT COUNT(*) as auth_count FROM auth.users WHERE email LIKE '%abshana03%';
-- Both should show 0

-- =====================================================


-- =====================================================
-- STEP 4: Now recreate the user via the app
-- =====================================================
-- 1. Go to http://localhost:3001/users
-- 2. Click "Create New User"
-- 3. Fill in:
--    Username: abshana03
--    Password: Admin@123 (or your choice - remember it!)
--    Display Name: Abshana
--    Role: admin
-- 4. Click "Create User"
-- 5. Wait for success message
-- 6. Try logging in immediately with:
--    Username: abshana03
--    Password: Admin@123 (or whatever you set)
-- =====================================================


-- =====================================================
-- STEP 5: If still getting "invalid" error after recreation
-- =====================================================
-- Check if email was confirmed automatically:

SELECT 
  email,
  email_confirmed_at,
  confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'RUN: UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = ''' || email || ''';'
    ELSE '✅ Email already confirmed'
  END as fix_command
FROM auth.users
WHERE email = 'abshana03@crunchy-times.local';

-- If fix_command shows an UPDATE statement, copy and run it
-- =====================================================


-- =====================================================
-- STEP 6: ALTERNATIVE - Reset password in Supabase Dashboard
-- =====================================================
-- If you still can't login:
-- 1. Go to Supabase Dashboard
-- 2. Authentication → Users
-- 3. Search for: abshana03@crunchy-times.local
-- 4. Click on the user
-- 5. Click "Send Password Reset Email" or "Update User"
-- 6. In the form, set a new password: Admin@123
-- 7. Save
-- 8. Try logging in with the new password
-- =====================================================


-- =====================================================
-- DEBUGGING: Check what the login is actually trying
-- =====================================================
-- When you try to login with "abshana03", the system converts it to:
-- abshana03@crunchy-times.local

-- So the auth.users table MUST have exactly this email:
SELECT 
  id,
  email,
  CASE 
    WHEN email = 'abshana03@crunchy-times.local' THEN '✅ Email format is correct'
    ELSE '❌ Email format is WRONG - this is why login fails!'
  END as email_check,
  email_confirmed_at
FROM auth.users
WHERE email LIKE '%abshana03%';

-- If email is different (like just 'abshana03' or something else), 
-- you need to update it:

UPDATE auth.users
SET email = 'abshana03@crunchy-times.local'
WHERE id IN (
  SELECT id FROM users WHERE username = 'abshana03'
);

-- Then confirm it:
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'abshana03@crunchy-times.local';
-- =====================================================
