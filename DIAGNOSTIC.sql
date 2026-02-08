-- =====================================================
-- DIAGNOSTIC - Run this FIRST to see what's wrong
-- =====================================================
-- Copy and run this entire query in Supabase SQL Editor
-- It will show you exactly what's set up and what's missing
-- =====================================================

-- Check 1: Do you exist in users table with admin role?
SELECT 
  'USER CHECK' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ You exist with role: ' || MAX(role)
    ELSE '❌ You do NOT exist in users table'
  END as status
FROM users 
WHERE email = 'qs1.tdr@gmail.com'

UNION ALL

-- Check 2: Does inventory table exist?
SELECT 
  'INVENTORY TABLE',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory')
    THEN '✅ Inventory table exists'
    ELSE '❌ Inventory table MISSING'
  END

UNION ALL

-- Check 3: How many policies on inventory?
SELECT 
  'INVENTORY POLICIES',
  '📋 Found ' || COUNT(*)::text || ' policies: ' || string_agg(policyname, ', ')
FROM pg_policies 
WHERE tablename = 'inventory'

UNION ALL

-- Check 4: Is RLS enabled on inventory?
SELECT 
  'RLS ON INVENTORY',
  CASE 
    WHEN relrowsecurity THEN '✅ RLS is enabled'
    ELSE '❌ RLS is disabled'
  END
FROM pg_class 
WHERE relname = 'inventory';

-- =====================================================
-- INTERPRET RESULTS:
-- =====================================================
-- 1. USER CHECK: Should show "✅ You exist with role: admin"
--    If shows ❌ or different role → Need to fix user
--
-- 2. INVENTORY TABLE: Should show "✅ Inventory table exists"
--    If ❌ → Need to create table
--
-- 3. INVENTORY POLICIES: Should show exactly 4 policies
--    If more than 4 → Have duplicates (need cleanup)
--    If less than 4 → Missing policies
--
-- 4. RLS ON INVENTORY: Should show "✅ RLS is enabled"
--    If ❌ → Need to enable RLS
-- =====================================================
