-- =====================================================
-- ADD YOUR CURRENT USER TO USERS TABLE
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Temporarily disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Insert your auth user into the users table
INSERT INTO public.users (id, email, username, display_name, role, custom_permissions)
SELECT 
    id,
    email,
    COALESCE(
        raw_user_meta_data->>'username',
        split_part(email, '@', 1)
    ) as username,
    COALESCE(
        raw_user_meta_data->>'display_name',
        split_part(email, '@', 1)
    ) as display_name,
    'admin' as role,  -- Set as admin
    NULL as custom_permissions
FROM auth.users
WHERE id = '4ce74b2e-5e9c-4c13-b266-2261591ae47a'
ON CONFLICT (id) DO UPDATE
SET 
    role = 'admin';

-- Also sync any other missing users from auth
INSERT INTO public.users (id, email, username, display_name, role, custom_permissions)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'username',
        split_part(au.email, '@', 1)
    ) as username,
    COALESCE(
        au.raw_user_meta_data->>'display_name',
        split_part(au.email, '@', 1)
    ) as display_name,
    'staff' as role,  -- Default to staff for others
    NULL as custom_permissions
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verify the fix
SELECT 
    id, 
    email, 
    username, 
    display_name, 
    role,
    CASE 
        WHEN id = '4ce74b2e-5e9c-4c13-b266-2261591ae47a' THEN '✅ YOUR ADMIN USER'
        ELSE ''
    END as note
FROM public.users
ORDER BY created_at DESC;

-- =====================================================
-- DONE! Your user should now be in the users table as admin
-- =====================================================
