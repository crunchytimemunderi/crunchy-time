-- =====================================================
-- FIX SALES TABLE SCHEMA
-- =====================================================
-- Run this in Supabase SQL Editor to fix the sales table
-- =====================================================

-- First, check current sales table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;

-- =====================================================
-- If the table doesn't have the right columns, drop and recreate it
-- =====================================================

DROP TABLE IF EXISTS sales CASCADE;

CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi')),
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_name TEXT NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);
CREATE INDEX idx_sales_created_by ON sales(created_by);

-- Enable Row Level Security
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone authenticated can read sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON sales;
DROP POLICY IF EXISTS "Admins can update sales" ON sales;
DROP POLICY IF EXISTS "Admins can delete sales" ON sales;

-- Policy: Anyone authenticated can read sales
CREATE POLICY "Anyone authenticated can read sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert sales
CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Admins can update sales
CREATE POLICY "Admins can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can delete sales
CREATE POLICY "Admins can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- VERIFY THE TABLE
-- =====================================================

-- Check the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;

-- Check policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'sales';

-- Test: Try to insert a sale (replace with your actual user ID)
-- Get your user ID first:
SELECT id, email FROM auth.users WHERE email = 'qs1.tdr@gmail.com';

-- Then test insert (replace YOUR_USER_ID_HERE):
/*
INSERT INTO sales (amount, payment_method, description, date, created_by, created_by_name)
VALUES (100.50, 'cash', 'Test Sale', CURRENT_DATE, 'YOUR_USER_ID_HERE', 'Test User');

-- Check if it worked:
SELECT * FROM sales WHERE description = 'Test Sale';

-- Clean up test:
DELETE FROM sales WHERE description = 'Test Sale';
*/

-- =====================================================
-- SUCCESS!
-- =====================================================
-- If you see the columns: id, amount, payment_method, description, date, created_at, created_by, created_by_name
-- Then the table is correctly set up!
-- =====================================================
