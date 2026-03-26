-- =====================================================
-- CREATE ADMIN USER IN USERS TABLE
-- =====================================================
-- Run this in Supabase SQL Editor to create your admin account
-- Replace the values with your actual admin details
-- =====================================================

-- IMPORTANT: Get your auth user ID first
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Find your admin user email and copy the UUID (User UID)
-- 3. Replace 'YOUR-AUTH-USER-ID-HERE' below with that UUID

-- Insert admin user into users table
INSERT INTO public.users (
    id,
    email,
    username,
    display_name,
    role,
    custom_permissions
) VALUES (
    'YOUR-AUTH-USER-ID-HERE',  -- Replace with actual auth user ID from Authentication > Users
    'admin@crunchytimes.com',   -- Replace with your actual email
    'admin',                     -- Username for login
    'Admin User',                -- Display name
    'admin',                     -- Role (must be 'admin' or 'staff')
    NULL                         -- No custom permissions needed for admin
)
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role;

-- ✅ After running this, try logging in again!

-- =====================================================
-- VERIFY USER WAS CREATED
-- =====================================================
-- Run this to confirm the user exists:

-- SELECT id, email, username, role, display_name 
-- FROM public.users 
-- WHERE role = 'admin';

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================
-- If you get "User data not found" error:
-- 1. Check Authentication > Users in Supabase Dashboard
-- 2. Verify the email exists there
-- 3. Copy the User UID from Authentication
-- 4. Make sure it matches the 'id' in the users table
-- 5. The ID must be the same in both places!
-- =====================================================
