-- =====================================================
-- COMPLETE INVENTORY SETUP - RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================
-- This script will:
-- 1. Create the inventory table (if not exists)
-- 2. Create indexes
-- 3. Set up RLS policies
-- 4. Make your user an ADMIN
-- =====================================================

-- 1. Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('chicken', 'oil', 'masala', 'gas', 'packaging', 'other')),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  stock_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'litre', 'piece', 'packet', 'box')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes (if not exists)
CREATE INDEX IF NOT EXISTS idx_inventory_item_name ON inventory(item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);

-- 3. Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist (so this script is re-runnable)
DROP POLICY IF EXISTS "Users can read inventory" ON inventory;
DROP POLICY IF EXISTS "Admins can insert inventory" ON inventory;
DROP POLICY IF EXISTS "Admins can update inventory" ON inventory;
DROP POLICY IF EXISTS "Admins can delete inventory" ON inventory;

-- 5. Create RLS policies
CREATE POLICY "Users can read inventory"
  ON inventory FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can update inventory"
  ON inventory FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can delete inventory"
  ON inventory FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 6. SET USERS AS ADMIN (by email - easier to identify)
-- Add more emails to this list if you have multiple admins
UPDATE users 
SET role = 'admin' 
WHERE email IN (
  'qs1.tdr@gmail.com'
  -- Add more admin emails here, separated by commas:
  -- ,'another-admin@example.com',
  -- ,'third-admin@example.com'
);

-- 7. Verify setup - check all admin users
SELECT id, email, role, display_name 
FROM users 
WHERE role = 'admin';

-- =====================================================
-- AFTER RUNNING THIS:
-- 1. Log out from the app
-- 2. Log back in
-- 3. Now you can access /inventory
-- =====================================================
