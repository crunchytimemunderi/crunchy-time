-- =====================================================
-- TEST RLS POLICIES - ARE THEY BLOCKING USERS?
-- =====================================================
-- This will test if authenticated users can read their data
-- =====================================================

-- Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users' AND schemaname = 'public';

-- Check all policies on users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;

-- =====================================================
-- IF YOU SEE RESTRICTIVE POLICIES, RUN THE FIX BELOW
-- =====================================================

-- Temporarily make users table readable by all authenticated users
-- This is a temporary fix to test if RLS is the issue

DROP POLICY IF EXISTS "Allow authenticated users to read all users" ON public.users;

CREATE POLICY "Allow authenticated users to read all users"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

-- Now try logging in again - it should work!

-- =====================================================
-- Verify the new policy is active
-- =====================================================
SELECT 
    policyname,
    cmd,
    qual as using_expression
FROM pg_policies
WHERE tablename = 'users' 
AND policyname = 'Allow authenticated users to read all users';
