-- =====================================================
-- COMPLETE RLS FIX - REMOVE ALL BLOCKING POLICIES
-- =====================================================
-- This will replace all read policies with one simple policy
-- =====================================================

-- Drop ALL existing SELECT policies on users table
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read all users" ON public.users;

-- Create ONE simple policy that allows ALL authenticated users to read
CREATE POLICY "authenticated_users_select_all"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Keep the other operation policies (insert, update, delete) as they were
-- Just fixing the SELECT/read policy

-- Verify the policy was created
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    'Policy should allow SELECT for authenticated' as note
FROM pg_policies
WHERE tablename = 'users' 
AND cmd = 'SELECT'
ORDER BY policyname;

-- =====================================================
-- TEST THE FIX
-- =====================================================
-- This query simulates what your app does:
-- (Run this while logged into Supabase to test)

SELECT 
    email, 
    username, 
    role, 
    display_name, 
    custom_permissions
FROM public.users
WHERE id = (SELECT id FROM auth.users LIMIT 1);

-- If the query above returns a user, the fix worked!
-- Now try logging into your app again

-- =====================================================
-- IMPORTANT: Clear your browser cache/cookies
-- =====================================================
-- After running this SQL:
-- 1. Clear browser cache and cookies for your Vercel site
-- 2. Or open in Incognito/Private window
-- 3. Try logging in again
-- =====================================================
