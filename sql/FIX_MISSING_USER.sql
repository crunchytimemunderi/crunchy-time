-- =====================================================
-- ADD MISSING USER - SIMPLE VERSION
-- =====================================================
-- This only adds the missing first sales123 account
-- The other 3 users already exist in your table
-- =====================================================

-- Temporarily disable RLS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Add only the missing user (first sales123)
INSERT INTO public.users (id, email, username, display_name, role, custom_permissions) VALUES
    (
        '16ec3cd4-58f4-4c04-98fe-f92d3b2ba0a2',
        'sales123@crunchy-times.local',
        'sales123',
        'Sales 123',
        'admin',
        NULL
    )
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verify all users
SELECT id, email, username, display_name, role
FROM public.users
ORDER BY created_at DESC;

-- =====================================================
-- DONE! Now you should have 4 users and all can login
-- =====================================================
