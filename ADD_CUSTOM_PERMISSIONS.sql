-- =====================================================
-- ADD CUSTOM PERMISSIONS TO USERS TABLE
-- =====================================================
-- This allows granular permission control per user
-- =====================================================

-- Add custom permissions column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS custom_permissions jsonb DEFAULT NULL;

-- Comment on the column
COMMENT ON COLUMN users.custom_permissions IS 
'Custom permissions override for this user. NULL means use role defaults. JSON format: {"canViewDashboard": true, "canAddSales": true, ...}';

-- =====================================================
-- PERMISSION STRUCTURE (for reference)
-- =====================================================
-- {
--   "canViewDashboard": true,
--   "canAddSales": true,
--   "canAddExpenses": true,
--   "canViewAllSales": false,
--   "canViewAllExpenses": false,
--   "canEditRecords": false,
--   "canDeleteRecords": false,
--   "canDoCashReconciliation": false,
--   "canEditPastReconciliation": false,
--   "canViewInventory": false,
--   "canManageInventory": false,
--   "canManageUsers": false
-- }

-- =====================================================
-- VERIFY
-- =====================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'custom_permissions';
