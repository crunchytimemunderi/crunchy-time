-- =====================================================
-- REMOVE CATEGORY CHECK CONSTRAINT FROM EXPENSES
-- =====================================================
-- This allows custom expense categories (e.g., "marketing", "sales")
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop the check constraint that limits category values
ALTER TABLE public.expenses 
DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Verify constraint is removed
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name='expenses' 
ORDER BY constraint_name;

-- =====================================================
-- DONE! Expenses can now accept any custom category
-- =====================================================
