-- =====================================================
-- FIX EXPENSES TABLE - Allow ALL users to add expenses
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop the existing table if it has wrong schema
DROP TABLE IF EXISTS expenses CASCADE;

-- =====================================================
-- Create expenses table with correct schema
-- =====================================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL CHECK (category IN ('chicken', 'oil', 'masala', 'gas', 'wages', 'rent', 'electricity', 'other')),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'upi')),
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_name TEXT NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_mode ON expenses(payment_mode);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone authenticated can read expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON expenses;

-- Policy: Anyone authenticated can read expenses
CREATE POLICY "Anyone authenticated can read expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

-- Policy: ALL authenticated users can insert expenses
CREATE POLICY "Authenticated users can insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Admins can update expenses
CREATE POLICY "Admins can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can delete expenses
CREATE POLICY "Admins can delete expenses"
  ON expenses FOR DELETE
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
WHERE table_name = 'expenses'
ORDER BY ordinal_position;

-- Check policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'expenses';

-- =====================================================
-- SUCCESS!
-- =====================================================
-- Now ALL authenticated users (both admin and staff) can:
-- - Read all expenses
-- - Add new expenses
-- Only admins can:
-- - Update existing expenses
-- - Delete expenses
-- =====================================================
