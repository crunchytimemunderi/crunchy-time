-- Add soft delete columns to tables
-- This allows "undo" functionality by marking records as deleted instead of removing them

-- Add deleted_at column to sales
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Add deleted_at column to expenses
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Add deleted_at column to menu_items
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Add deleted_at column to cash_reconciliation (singular)
ALTER TABLE cash_reconciliation 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON sales(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_deleted_at ON menu_items(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cash_deleted_at ON cash_reconciliation(deleted_at) WHERE deleted_at IS NULL;

-- Function to soft delete with user tracking
CREATE OR REPLACE FUNCTION soft_delete_record(
  table_name TEXT,
  record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  query TEXT;
BEGIN
  query := format(
    'UPDATE %I SET deleted_at = NOW(), deleted_by = auth.uid() WHERE id = $1 AND deleted_at IS NULL',
    table_name
  );
  EXECUTE query USING record_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore soft-deleted record
CREATE OR REPLACE FUNCTION restore_record(
  table_name TEXT,
  record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  query TEXT;
BEGIN
  query := format(
    'UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    table_name
  );
  EXECUTE query USING record_id;
  
  -- Log restoration in audit log
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    user_id,
    user_email
  ) VALUES (
    table_name,
    record_id::TEXT,
    'RESTORE',
    auth.uid(),
    auth.email()
  );
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Update all SELECT queries to include WHERE deleted_at IS NULL
-- This will be done in the application code
