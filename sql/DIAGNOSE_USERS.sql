-- =====================================================
-- DIAGNOSE AND FIX USER SYNC ISSUE
-- =====================================================
-- This will show what's wrong and fix it
-- =====================================================

-- STEP 1: Check what's in auth.users
SELECT 
    'AUTH USERS:' as source,
    id,
    email,
    created_at
FROM auth.users
ORDER BY created_at;

-- STEP 2: Check what's in public.users
SELECT 
    'PUBLIC USERS:' as source,
    id,
    email,
    username,
    role,
    created_at
FROM public.users
ORDER BY created_at;

-- STEP 3: Find users in auth but NOT in public.users
SELECT 
    'MISSING FROM public.users:' as status,
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- =====================================================
-- If you see missing users above, run the next section
-- =====================================================
