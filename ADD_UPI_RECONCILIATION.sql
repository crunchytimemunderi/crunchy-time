-- =====================================================
-- CREATE CASH & UPI RECONCILIATION TABLE
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS cash_reconciliation CASCADE;

-- Create cash_reconciliation table with both Cash and UPI tracking
CREATE TABLE cash_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  
  -- CASH COLUMNS
  opening_cash NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  cash_sales NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cash_sales >= 0),
  cash_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (cash_expenses >= 0),
  expected_closing_cash NUMERIC(10, 2) NOT NULL DEFAULT 0,
  actual_closing_cash NUMERIC(10, 2) NOT NULL DEFAULT 0,
  difference NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  
  -- UPI COLUMNS
  opening_upi NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (opening_upi >= 0),
  upi_sales NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (upi_sales >= 0),
  upi_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (upi_expenses >= 0),
  expected_closing_upi NUMERIC(10, 2) NOT NULL DEFAULT 0,
  actual_closing_upi NUMERIC(10, 2) NOT NULL DEFAULT 0,
  upi_difference NUMERIC(10, 2) NOT NULL DEFAULT 0,
  upi_notes TEXT,
  
  -- METADATA
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_name TEXT NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX idx_cash_rec_date ON cash_reconciliation(date DESC);
CREATE INDEX idx_cash_rec_created_at ON cash_reconciliation(created_at DESC);
CREATE INDEX idx_cash_rec_difference ON cash_reconciliation(difference);
CREATE INDEX idx_cash_rec_upi_difference ON cash_reconciliation(upi_difference);
CREATE INDEX idx_cash_rec_created_by ON cash_reconciliation(created_by);

-- Enable Row Level Security
ALTER TABLE cash_reconciliation ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read all reconciliations" ON cash_reconciliation;
DROP POLICY IF EXISTS "Admins can insert reconciliations" ON cash_reconciliation;
DROP POLICY IF EXISTS "Admins can update reconciliations" ON cash_reconciliation;
DROP POLICY IF EXISTS "Admins can delete reconciliations" ON cash_reconciliation;

-- Policy: Only admins can read reconciliations
CREATE POLICY "Admins can read all reconciliations"
  ON cash_reconciliation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can insert reconciliations
CREATE POLICY "Admins can insert reconciliations"
  ON cash_reconciliation FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can update reconciliations
CREATE POLICY "Admins can update reconciliations"
  ON cash_reconciliation FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can delete reconciliations
CREATE POLICY "Admins can delete reconciliations"
  ON cash_reconciliation FOR DELETE
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

-- Check the updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'cash_reconciliation'
ORDER BY ordinal_position;

-- =====================================================
-- SUCCESS!
-- =====================================================
-- Now cash_reconciliation table includes both Cash and UPI tracking:
-- 
-- CASH COLUMNS:
-- - opening_cash
-- - cash_sales
-- - cash_expenses
-- - expected_closing_cash
-- - actual_closing_cash
-- - difference (cash difference)
-- - notes (cash notes)
--
-- UPI COLUMNS:
-- - opening_upi
-- - upi_sales
-- - upi_expenses
-- - expected_closing_upi
-- - actual_closing_upi
-- - upi_difference
-- - upi_notes
-- =====================================================
