-- =====================================================
-- CHECK AND FIX STAFF USER PERMISSIONS
-- =====================================================
-- This will check if staff users have custom_permissions set
-- and add default permissions if missing
-- =====================================================

-- STEP 1: Check current permissions for all users
-- =====================================================
SELECT 
  username,
  email,
  role,
  custom_permissions,
  CASE 
    WHEN custom_permissions IS NULL THEN '❌ No custom permissions - using role defaults'
    ELSE '✅ Has custom permissions'
  END as permissions_status
FROM users
ORDER BY role DESC, username;

-- =====================================================


-- STEP 2: Set default custom permissions for staff users
-- =====================================================
-- This will give staff users the correct default permissions:
-- - CAN view Dashboard, Sales, Expenses
-- - CANNOT view Reports
-- - CAN add sales and expenses

UPDATE users
SET custom_permissions = jsonb_build_object(
  'canViewDashboard', true,
  'canAddSales', true,
  'canAddExpenses', true,
  'canViewReports', false,
  'canViewExpenses', true,
  'canViewAllSales', false,
  'canViewAllExpenses', false,
  'canEditRecords', false,
  'canDeleteRecords', false,
  'canDoCashReconciliation', false,
  'canEditPastReconciliation', false,
  'canViewInventory', false,
  'canManageInventory', false,
  'canManageUsers', false
)
WHERE role = 'staff';

-- Check how many were updated:
SELECT 'Updated ALL staff users with default permissions' as action;
-- =====================================================


-- STEP 3: Verify the update
-- =====================================================
SELECT 
  username,
  email,
  role,
  custom_permissions->>'canViewDashboard' as can_dashboard,
  custom_permissions->>'canAddSales' as can_sales,
  custom_permissions->>'canViewExpenses' as can_expenses,
  custom_permissions->>'canViewReports' as can_reports,
  CASE 
    WHEN custom_permissions->>'canViewDashboard' = 'true' THEN '✅ Can see Dashboard'
    ELSE '❌ Cannot see Dashboard'
  END as dashboard_access,
  CASE 
    WHEN custom_permissions->>'canViewExpenses' = 'true' THEN '✅ Can see Expenses'
    ELSE '❌ Cannot see Expenses'
  END as expenses_access,
  CASE 
    WHEN custom_permissions->>'canViewReports' = 'true' THEN '✅ Can see Reports'
    ELSE '❌ Cannot see Reports (correct for staff)'
  END as reports_access
FROM users
WHERE role = 'staff'
ORDER BY username;

-- All staff users should show:
-- ✅ Can see Dashboard
-- ✅ Can see Expenses
-- ❌ Cannot see Reports
-- =====================================================


-- STEP 4: Alternative - Clear custom permissions to use code defaults
-- =====================================================
-- If you want to use the default permissions defined in code instead
-- of database, run this to clear custom_permissions:

-- UPDATE users
-- SET custom_permissions = NULL
-- WHERE role = 'staff';

-- This will make the system use the defaults in auth-context.tsx
-- =====================================================
