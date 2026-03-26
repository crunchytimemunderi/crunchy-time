-- =====================================================
-- SYNC ALL AUTH USERS TO PUBLIC USERS TABLE
-- =====================================================
-- This uses a different approach that should work
-- =====================================================

-- Temporarily disable RLS on public.users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Method 1: Direct insert from auth.users (this should work if foreign key is correct)
INSERT INTO public.users (id, email, username, display_name, role, custom_permissions)
SELECT 
    id,
    email,
    split_part(email, '@', 1) as username,
    split_part(email, '@', 1) as display_name,
    'admin' as role,  -- Set all as admin initially, we can change later
    NULL as custom_permissions
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Show results
SELECT 
    u.id, 
    u.email, 
    u.username, 
    u.role,
    'EXISTS IN AUTH' as verified
FROM public.users u
INNER JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at DESC;

-- =====================================================
-- ALL DONE! All auth users should now be synced
-- =====================================================
