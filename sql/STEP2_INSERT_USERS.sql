-- =====================================================
-- STEP 2: INSERT USERS WITH CORRECT IDS
-- =====================================================
-- Replace the UUIDs below with the EXACT ones from STEP 1
-- =====================================================

-- Temporarily disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Insert all missing users
-- IMPORTANT: Replace these UUIDs with the exact ones from STEP 1!
INSERT INTO public.users (id, email, username, display_name, role, custom_permissions)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
    COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)) as display_name,
    CASE 
        WHEN au.email LIKE 'sales123@%' THEN 'admin'
        WHEN au.email LIKE 'abshana%' THEN 'admin'
        WHEN au.email LIKE 'ubaidul%' THEN 'admin'
        ELSE 'staff'
    END as role,
    NULL as custom_permissions
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verify all users
SELECT 
    u.id, 
    u.email, 
    u.username, 
    u.display_name, 
    u.role
FROM public.users u
ORDER BY u.created_at DESC;

-- =====================================================
-- DONE! All authenticated users should now be in users table
-- =====================================================
