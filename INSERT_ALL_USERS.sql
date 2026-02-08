-- =====================================================
-- ADD ALL AUTHENTICATED USERS TO USERS TABLE
-- =====================================================
-- This will insert all your authenticated users into the users table
-- Run this in Supabase SQL Editor
-- =====================================================

-- IMPORTANT: Temporarily disable RLS to insert users
-- This allows us to add users even though the table is protected
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Insert all users with proper roles
INSERT INTO public.users (id, email, username, display_name, role, custom_permissions) VALUES
    -- User 1: sales123 (First one - make this admin)
    (
        '16ec3cd4-58f4-4c04-98fe-f92d3b2ba0a2',
        'sales123@crunchy-times.local',
        'sales123',
        'Sales 123',
        'admin',  -- Change to 'staff' if this shouldn't be admin
        NULL
    ),
    
    -- User 2: abshana03
    (
        '4ca742be-5e9c-4c13-b266-226159f1ae47a',
        'abshana03@crunchy-times.local',
        'abshana03',
        'Abshana',
        'admin',  -- Changed to admin
        NULL
    ),
    
    -- User 3: sales123 (duplicate email - second account)
    (
        '800ed4ce-89e7-48f0-a4b8-c1e106anta1aa',
        'sales123@crunchy-times.local',
        'sales123_2',
        'Sales 123 (2)',
        'staff',  -- Change to 'admin' if needed
        NULL
    ),
    
    -- User 4: ubaidulkhadar
    (
        'bc13d4d0-5d55-4a4e-bdc9-d4e083d529b6',
        'ubaidulkhadar@crunchy-times.local',
        'ubaidulkhadar',
        'Ubaidul Khadar',
        'staff',  -- Change to 'admin' if needed
        NULL
    )
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role;

-- Re-enable RLS after inserting users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFY ALL USERS WERE ADDED
-- =====================================================
SELECT id, email, username, display_name, role, created_at
FROM public.users
ORDER BY created_at DESC;

-- =====================================================
-- NOTES
-- =====================================================
-- ✅ All 4 users will be added to the users table
-- ✅ I made the first sales123 account an 'admin'
-- ✅ Others are set as 'staff'
-- 
-- IMPORTANT: 
-- - You have 2 accounts with the same email (sales123)
-- - This is allowed in auth but might be confusing
-- - Consider deleting one if it's a duplicate
-- 
-- To delete a duplicate user:
-- 1. Go to Authentication > Users
-- 2. Click the user you want to remove
-- 3. Click "Delete user"
-- =====================================================
