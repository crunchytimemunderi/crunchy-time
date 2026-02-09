-- Create audit_log table to track all deletion operations
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('DELETE', 'RESTORE')),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  deleted_data JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all audit logs (for transparency)
DROP POLICY IF EXISTS "Users can view audit logs" ON audit_log;
CREATE POLICY "Users can view audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (true);

-- Policy: System can insert audit logs
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;
CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to log deletions automatically
CREATE OR REPLACE FUNCTION log_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    user_id,
    user_email,
    deleted_data
  ) VALUES (
    TG_TABLE_NAME,
    OLD.id::TEXT,
    'DELETE',
    auth.uid(),
    auth.email(),
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for each table (add more as needed)
DROP TRIGGER IF EXISTS sales_deletion_audit ON sales;
CREATE TRIGGER sales_deletion_audit
  BEFORE DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION log_deletion();

DROP TRIGGER IF EXISTS expenses_deletion_audit ON expenses;
CREATE TRIGGER expenses_deletion_audit
  BEFORE DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION log_deletion();

DROP TRIGGER IF EXISTS menu_items_deletion_audit ON menu_items;
CREATE TRIGGER menu_items_deletion_audit
  BEFORE DELETE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION log_deletion();
