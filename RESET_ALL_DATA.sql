-- =====================================================
-- RESET ALL DATA - Fresh Start for Actual Data Entry
-- =====================================================
-- This script will:
-- 1. Delete ALL test/dummy data from all tables
-- 2. Keep your admin user intact
-- 3. Prepare system for actual data starting Feb 1, 2026
-- =====================================================
-- ⚠️ WARNING: This will DELETE ALL DATA!
-- ⚠️ Make sure you have backups if needed!
-- =====================================================

-- =====================================================
-- STEP 1: VERIFY YOUR ADMIN USER BEFORE DELETING ANYTHING
-- =====================================================
-- Run this first to see your admin user details
-- Copy the username/email - you'll need it to login after reset

SELECT 
  id,
  username,
  email,
  display_name,
  role,
  created_at
FROM users
WHERE role = 'admin'
ORDER BY created_at ASC
LIMIT 1;

-- IMPORTANT: Write down your admin username from above!
-- Example: admincrunchytime or admin@crunchytime.com
-- =====================================================


-- =====================================================
-- STEP 2: DELETE ALL TRANSACTIONAL DATA
-- =====================================================
-- This removes all sales, expenses, cash records, and inventory
-- Run each DELETE one at a time and verify

-- Delete cash reconciliation records
DELETE FROM cash_reconciliation;

-- Verify deletion:
SELECT COUNT(*) as remaining_cash_records FROM cash_reconciliation;
-- Expected: 0

-- Delete all sales records
DELETE FROM sales;

-- Verify deletion:
SELECT COUNT(*) as remaining_sales FROM sales;
-- Expected: 0

-- Delete all expense records
DELETE FROM expenses;

-- Verify deletion:
SELECT COUNT(*) as remaining_expenses FROM expenses;
-- Expected: 0

-- Delete all inventory items
DELETE FROM inventory;

-- Verify deletion:
SELECT COUNT(*) as remaining_inventory FROM inventory;
-- Expected: 0

-- Delete all menu items (if table exists)
DELETE FROM menu_items;

-- Verify deletion:
SELECT COUNT(*) as remaining_menu_items FROM menu_items;
-- Expected: 0

-- =====================================================


-- =====================================================
-- STEP 3: DELETE ALL STAFF USERS (KEEP ADMIN ONLY)
-- =====================================================
-- This removes all users except your admin account

-- First, see which users will be deleted:
SELECT 
  id,
  username,
  email,
  display_name,
  role,
  '❌ Will be deleted' as status
FROM users
WHERE role != 'admin'
ORDER BY created_at DESC;

-- If you're OK with deleting these users, run:
-- NOTE: This will delete from both users table AND auth.users

-- Delete from users table first
DELETE FROM users
WHERE role != 'admin';

-- Now delete corresponding auth users
-- This requires admin privileges
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM users WHERE role = 'admin');

-- Verify only admin remains:
SELECT 
  u.id,
  u.username,
  u.email,
  u.display_name,
  u.role,
  au.email as auth_email,
  '✅ Admin user preserved' as status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.role = 'admin';

-- Expected: Only your admin user should show
-- =====================================================


-- =====================================================
-- STEP 4: RESET AUTO-INCREMENT SEQUENCES (Optional)
-- =====================================================
-- This is optional but makes IDs cleaner for new data

-- Note: UUID-based tables don't need this
-- Only needed if you have SERIAL/BIGSERIAL columns
-- =====================================================


-- =====================================================
-- STEP 5: VERIFY CLEAN STATE
-- =====================================================
-- Run these to confirm everything is clean

-- Check all table counts:
SELECT 
  'users' as table_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 1 THEN '✅' ELSE '❌' END as status
FROM users
UNION ALL
SELECT 
  'sales',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END
FROM sales
UNION ALL
SELECT 
  'expenses',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END
FROM expenses
UNION ALL
SELECT 
  'inventory',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END
FROM inventory
UNION ALL
SELECT 
  'cash_reconciliation',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅' ELSE '❌' END
FROM cash_reconciliation;

-- Expected results:
-- users: 1 (your admin only) ✅
-- sales: 0 ✅
-- expenses: 0 ✅
-- inventory: 0 ✅
-- cash_reconciliation: 0 ✅
-- =====================================================


-- =====================================================
-- STEP 6: PREPARE FOR ACTUAL DATA ENTRY
-- =====================================================
-- Now you can start entering real data from Feb 1, 2026

-- Test login with your admin credentials:
-- Username: (from Step 1)
-- Password: (your admin password)

-- Then navigate to:
-- 1. /inventory - Add your actual inventory items
-- 2. /users - Add real staff members if needed
-- 3. /cash - Start entering sales from Feb 1, 2026
-- 4. /expenses - Start entering expenses from Feb 1, 2026

-- =====================================================
-- EXAMPLE: Adding your first real inventory items
-- =====================================================
-- After reset, add your actual inventory:

-- INSERT INTO inventory (item_name, category, unit_price, stock_quantity, unit)
-- VALUES 
--   ('Chicken Breast', 'chicken', 180.00, 50.00, 'kg'),
--   ('Sunflower Oil', 'oil', 150.00, 20.00, 'litre'),
--   ('Turmeric Powder', 'masala', 80.00, 5.00, 'kg'),
--   ('LPG Cylinder', 'gas', 900.00, 3.00, 'piece'),
--   ('Food Container Small', 'packaging', 10.00, 100.00, 'piece');

-- Verify inventory added:
-- SELECT * FROM inventory ORDER BY created_at DESC;
-- =====================================================


-- =====================================================
-- BACKUP YOUR ADMIN PASSWORD!
-- =====================================================
-- If you forgot your admin password, you can reset it:

-- Get your admin user ID:
-- SELECT id FROM users WHERE role = 'admin' LIMIT 1;

-- Then use Supabase Dashboard:
-- 1. Go to Authentication → Users
-- 2. Find your admin user by email
-- 3. Click on user → Reset Password
-- 4. Set new password

-- OR use SQL (if you have admin access):
-- UPDATE auth.users
-- SET encrypted_password = crypt('NewPassword123', gen_salt('bf'))
-- WHERE id = 'YOUR_ADMIN_USER_ID';
-- =====================================================


-- =====================================================
-- QUICK REFERENCE: Table Structures
-- =====================================================
/*
users:
  - id (uuid)
  - username (varchar, unique)
  - email (text)
  - display_name (text)
  - role ('admin' | 'staff')
  - custom_permissions (jsonb)
  - created_at (timestamp)

sales:
  - id (uuid)
  - date (date)
  - amount (numeric)
  - payment_method (text)
  - description (text)
  - created_at (timestamp)
  - created_by (uuid, FK to users)

expenses:
  - id (uuid)
  - date (date)
  - category (text)
  - amount (numeric)
  - description (text)
  - payment_method (text)
  - created_at (timestamp)
  - created_by (uuid, FK to users)

inventory:
  - id (uuid)
  - item_name (text, unique)
  - category (text)
  - unit_price (numeric)
  - stock_quantity (numeric)
  - unit (text)
  - created_at (timestamp)
  - updated_at (timestamp)

cash_reconciliation:
  - id (uuid)
  - date (date, unique)
  - total_cash_sales (numeric)
  - total_upi_sales (numeric)
  - total_expenses (numeric)
  - opening_balance (numeric)
  - closing_balance (numeric)
  - actual_cash (numeric)
  - variance (numeric)
  - notes (text)
  - created_at (timestamp)
  - updated_at (timestamp)
*/
-- =====================================================


-- =====================================================
-- DONE! 🎉
-- =====================================================
-- Your database is now clean and ready for actual data!
-- 
-- Next steps:
-- 1. Login at http://localhost:3001/login
-- 2. Add real inventory items at /inventory
-- 3. Start entering Feb 1st data at /cash
-- 4. Create staff users if needed at /users
-- 
-- All dates will start from February 1, 2026
-- =====================================================
