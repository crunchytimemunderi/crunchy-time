-- =====================================================
-- FIX EMAIL RATE LIMIT ERROR FOR USER CREATION
-- =====================================================
-- This fixes the "email rate limit exceeded" error when creating users
-- =====================================================

-- REQUIRED STEP: Disable email confirmations in Supabase Dashboard
-- 
-- Go to: https://supabase.com/dashboard/project/pgpguzihsrfqkfbjwuee
-- Navigation: Authentication → Settings → Email Auth
-- 
-- UNCHECK the following options:
-- ✓ "Enable email confirmations" - UNCHECK THIS
-- ✓ "Enable email confirmations for new users" - UNCHECK THIS
-- 
-- Then click "Save"

-- =====================================================
-- OPTIONAL: Manually confirm all existing users
-- =====================================================
-- If you already have users that need to be confirmed:

UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Note: confirmed_at is a generated column and will be automatically set

-- =====================================================
-- VERIFY SETTINGS
-- =====================================================
-- Check that all users are confirmed:

SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '❌ Not Confirmed'
  END as status
FROM auth.users
ORDER BY created_at DESC;

-- =====================================================
-- WHY THIS HAPPENS
-- =====================================================
-- Supabase has rate limits on email sending to prevent spam:
-- - Free tier: Limited emails per hour
-- - When creating users with dummy emails (@crunchy-times.local),
--   Supabase still tries to send confirmation emails
-- - This quickly hits the rate limit
-- 
-- SOLUTION: Disable email confirmations entirely since we're using
-- username-based authentication and dummy email addresses.

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
-- 1. **CRITICAL**: Go to Supabase Dashboard and disable email confirmations
--    (See "REQUIRED STEP" at the top of this file)
--
-- 2. OPTIONAL: Run the UPDATE query above to confirm existing users
--
-- 3. After disabling email confirmations:
--    - New users can login immediately without confirmation
--    - No confirmation emails will be sent
--    - No rate limit errors will occur
--
-- 4. Test by creating a new user in the app

-- =====================================================
-- ALTERNATIVE: Use Supabase Admin API (Already Implemented)
-- =====================================================
-- The app now uses Admin API which can bypass email confirmations,
-- but you still need to disable email sending in dashboard to avoid
-- rate limit errors during user creation.
