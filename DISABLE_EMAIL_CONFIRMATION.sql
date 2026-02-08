-- =====================================================
-- DISABLE EMAIL CONFIRMATION FOR ADMIN-CREATED USERS
-- =====================================================
-- This allows users created by admins to login immediately
-- without needing to confirm their email address
-- =====================================================

-- OPTION 1: Disable email confirmation entirely (EASIEST)
-- Go to: Supabase Dashboard → Authentication → Settings → Email Auth
-- UNCHECK "Enable email confirmations"

-- OPTION 2: Manually confirm existing users (SQL)
-- Run this to confirm all existing unconfirmed users:
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Note: confirmed_at is a generated column and will be set automatically

-- OPTION 3: Confirm specific user by email
-- Replace 'user@example.com' with the actual email:
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com'
AND email_confirmed_at IS NULL;

-- =====================================================
-- VERIFY CONFIRMATION STATUS
-- =====================================================
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '❌ Not Confirmed'
  END as status
FROM auth.users
ORDER BY created_at DESC;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
-- 1. RECOMMENDED: Use Option 1 (disable in dashboard)
--    - Go to Supabase Dashboard
--    - Authentication → Settings
--    - Email Auth section
--    - UNCHECK "Enable email confirmations"
--    - Save
--
-- 2. OR: Use Option 2 to confirm all existing users
--    - Run the UPDATE query above
--
-- 3. OR: Use Option 3 to confirm specific user
--    - Replace email and run query
--
-- After this, all new users can login immediately!
