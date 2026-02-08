-- =====================================================
-- CLEAN SETUP - Run this step by step in Supabase SQL Editor
-- =====================================================
-- INSTRUCTIONS: 
-- 1. Copy ONE section at a time
-- 2. Run it in Supabase SQL Editor
-- 3. Check the results before moving to next section
-- =====================================================

-- =====================================================
-- STEP 1: Check if YOU exist in the users table
-- =====================================================
-- Copy and run this first:

SELECT id, email, role, display_name 
FROM users 
WHERE email = 'qs1.tdr@gmail.com';

-- EXPECTED RESULT: 
-- - If you see your row: GOOD! Note your role value
-- - If empty/no results: You need to add yourself (see Step 2)
-- =====================================================


-- =====================================================
-- STEP 2: Add yourself to users table (ONLY if Step 1 was empty)
-- =====================================================
-- IMPORTANT: Only run this if Step 1 showed no results!
-- First, get your auth user ID:

SELECT id, email 
FROM auth.users 
WHERE email = 'qs1.tdr@gmail.com';

-- Copy the ID from above, then run this (replace YOUR_ID_HERE):

INSERT INTO users (id, email, role, display_name)
VALUES (
  'YOUR_ID_HERE',  -- Replace with ID from query above
  'qs1.tdr@gmail.com',
  'admin',
  'Admin User'
);

-- =====================================================


-- =====================================================
-- STEP 3: Set your role to admin (run this always)
-- =====================================================

UPDATE users 
SET role = 'admin' 
WHERE email = 'qs1.tdr@gmail.com';

-- Verify it worked:

SELECT id, email, role, display_name 
FROM users 
WHERE email = 'qs1.tdr@gmail.com';

-- EXPECTED: Should show role = 'admin'
-- =====================================================


-- =====================================================
-- STEP 4: Drop old inventory table (clean slate)
-- =====================================================

DROP TABLE IF EXISTS inventory CASCADE;

-- =====================================================


-- =====================================================
-- STEP 5: Create fresh inventory table
-- =====================================================

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('chicken', 'oil', 'masala', 'gas', 'packaging', 'other')),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  stock_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'litre', 'piece', 'packet', 'box')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_inventory_item_name ON inventory(item_name);
CREATE INDEX idx_inventory_category ON inventory(category);

-- Verify table created:

SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory'
ORDER BY ordinal_position;

-- =====================================================


-- =====================================================
-- STEP 6: Enable RLS and create policies
-- =====================================================

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone authenticated can read inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
CREATE POLICY "Only admins can insert inventory"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Only admins can update
CREATE POLICY "Only admins can update inventory"
  ON inventory FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Only admins can delete
CREATE POLICY "Only admins can delete inventory"
  ON inventory FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Verify policies created:

SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'inventory';

-- EXPECTED: Should show 4 policies
-- =====================================================


-- =====================================================
-- STEP 7: Test insert (verify you can add items)
-- =====================================================

INSERT INTO inventory (item_name, category, unit_price, stock_quantity, unit)
VALUES ('Test Chicken', 'chicken', 250.00, 10.00, 'kg');

-- Check if it worked:

SELECT * FROM inventory WHERE item_name = 'Test Chicken';

-- If you see the row: SUCCESS! 🎉
-- If error: Check your role in Step 3

-- Clean up test:

DELETE FROM inventory WHERE item_name = 'Test Chicken';

-- =====================================================


-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Run this to see everything is set up correctly:

SELECT 
  'User Setup' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM users WHERE email = 'qs1.tdr@gmail.com' AND role = 'admin') 
    THEN '✅ User is admin' 
    ELSE '❌ User not admin' 
  END as status
UNION ALL
SELECT 
  'Inventory Table',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory') 
    THEN '✅ Table exists' 
    ELSE '❌ Table missing' 
  END
UNION ALL
SELECT 
  'RLS Policies',
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'inventory') = 4 
    THEN '✅ All 4 policies exist' 
    ELSE '❌ Policies missing' 
  END;

-- EXPECTED: All should show ✅
-- =====================================================

-- =====================================================
-- ✅ AFTER ALL STEPS COMPLETE:
-- 1. Go back to your app
-- 2. Click "Logout"
-- 3. Log in again
-- 4. Everything should work now!
-- =====================================================
