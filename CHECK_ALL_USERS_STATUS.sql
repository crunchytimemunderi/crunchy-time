-- =====================================================
-- CHECK ALL EXISTING USERS AND THEIR LOGIN STATUS
-- =====================================================

SELECT 
  u.username,
  u.email as users_email,
  u.display_name,
  u.role,
  au.email as auth_email,
  au.email_confirmed_at,
  au.last_sign_in_at,
  CASE 
    WHEN au.id IS NULL THEN '❌ NO AUTH USER - Cannot login (delete this user)'
    WHEN au.email_confirmed_at IS NULL THEN '⚠️ Email not confirmed - Run: UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = ''' || au.id || ''';'
    ELSE '✅ CAN LOGIN'
  END as status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
ORDER BY u.role DESC, u.created_at ASC;

-- Look for users with ✅ CAN LOGIN status
-- These are the usernames you can use to login right now
-- =====================================================


-- =====================================================
-- IF NO USERS SHOW ✅ CAN LOGIN, RUN THIS:
-- =====================================================
-- This will confirm ALL existing auth users so they can login

UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Then run the SELECT query above again to verify
-- =====================================================
