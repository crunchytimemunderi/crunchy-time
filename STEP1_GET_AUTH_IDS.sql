-- =====================================================
-- STEP 1: GET CORRECT USER IDS FROM AUTH
-- =====================================================
-- Run this first to see all authenticated users and their real UUIDs
-- Copy the correct UUIDs from the results
-- =====================================================

SELECT 
    id,
    email,
    raw_user_meta_data->>'username' as username,
    created_at
FROM auth.users
ORDER BY created_at;

-- =====================================================
-- Copy the UUIDs from the results above, then proceed to STEP 2
-- =====================================================
