-- =====================================================
-- FIX abshana03 LOGIN ISSUE
-- =====================================================
-- Run these queries one by one to diagnose and fix
-- =====================================================

-- =====================================================
-- STEP 1: Check current status of abshana03
-- =====================================================
SELECT 
  u.id,
  u.username,
  u.email as users_email,
  u.display_name,
  u.role,
  au.email as auth_email,
  au.email_confirmed_at,
  au.confirmed_at,
  CASE 
    WHEN au.email_confirmed_at IS NULL THEN '❌ Email NOT confirmed - This is the problem!'
    ELSE '✅ Email confirmed'
  END as email_status,
  CASE 
    WHEN u.id = au.id THEN '✅ IDs match'
    ELSE '❌ ID mismatch'
  END as id_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.username = 'abshana03';

-- If email_status shows ❌, that's your problem!
-- =====================================================


-- =====================================================
-- STEP 2: FIX - Confirm the email manually
-- =====================================================
-- This will allow login to work

UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'abshana03@crunchy-times.local';

-- Verify the fix worked:
SELECT 
  email,
  email_confirmed_at,
  confirmed_at,
  '✅ NOW READY TO LOGIN' as status
FROM auth.users 
WHERE email = 'abshana03@crunchy-times.local';

-- =====================================================


-- =====================================================
-- STEP 3: Verify both tables are in sync
-- =====================================================
SELECT 
  u.username,
  u.email as users_table_email,
  au.email as auth_table_email,
  u.role,
  au.email_confirmed_at,
  CASE 
    WHEN u.email = au.email THEN '✅ Emails match'
    ELSE '❌ Email mismatch'
  END as email_match,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN '✅ Can login now!'
    ELSE '❌ Still cannot login'
  END as login_ready
FROM users u
JOIN auth.users au ON u.id = au.id
WHERE u.username = 'abshana03';

-- =====================================================


-- =====================================================
-- ALTERNATIVE: If user still doesn't exist, create directly
-- =====================================================
-- Only use this if the user doesn't show up in STEP 1

-- First, delete any incomplete entries:
-- DELETE FROM users WHERE username = 'abshana03';
-- DELETE FROM auth.users WHERE email = 'abshana03@crunchy-times.local';

-- Then create via app at /users
-- =====================================================


-- =====================================================
-- AFTER RUNNING STEP 2, TRY LOGGING IN:
-- =====================================================
-- Username: abshana03
-- Password: (your password)
-- 
-- Should work now! ✅
-- =====================================================
