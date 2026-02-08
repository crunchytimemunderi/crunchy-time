-- =====================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================
-- Run this entire file in Supabase SQL Editor
-- This will secure your database and prevent unauthorized access
-- =====================================================

-- =====================================================
-- 1. USERS TABLE
-- =====================================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Policy: Users can read their own data
CREATE POLICY "Users can read their own data"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy: Admins can read all users
CREATE POLICY "Admins can read all users"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Service role can insert users (for API route)
CREATE POLICY "Service role can insert users"
    ON public.users
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy: Admins can update users
CREATE POLICY "Admins can update users"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can delete users
CREATE POLICY "Admins can delete users"
    ON public.users
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Users can update their own profile (display_name, etc.)
CREATE POLICY "Users can update their own profile"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. SALES TABLE
-- =====================================================

-- Enable RLS on sales table
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;

-- Policy: Authenticated users can read sales
CREATE POLICY "Authenticated users can read sales"
    ON public.sales
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Authenticated users can insert sales
CREATE POLICY "Authenticated users can insert sales"
    ON public.sales
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Admins can update sales
CREATE POLICY "Admins can update sales"
    ON public.sales
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can delete sales
CREATE POLICY "Admins can delete sales"
    ON public.sales
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- 3. EXPENSES TABLE
-- =====================================================

-- Enable RLS on expenses table
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;

-- Policy: Authenticated users can read expenses
CREATE POLICY "Authenticated users can read expenses"
    ON public.expenses
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Authenticated users can insert expenses
CREATE POLICY "Authenticated users can insert expenses"
    ON public.expenses
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Admins can update expenses
CREATE POLICY "Admins can update expenses"
    ON public.expenses
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can delete expenses
CREATE POLICY "Admins can delete expenses"
    ON public.expenses
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- 4. CASH_RECONCILIATION TABLE
-- =====================================================

-- Enable RLS on cash_reconciliation table
ALTER TABLE public.cash_reconciliation ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read cash records" ON public.cash_reconciliation;
DROP POLICY IF EXISTS "Authenticated users can insert cash records" ON public.cash_reconciliation;
DROP POLICY IF EXISTS "Authenticated users can update cash records" ON public.cash_reconciliation;
DROP POLICY IF EXISTS "Admins can delete cash records" ON public.cash_reconciliation;

-- Policy: Authenticated users can read cash records
CREATE POLICY "Authenticated users can read cash records"
    ON public.cash_reconciliation
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Authenticated users can insert cash records
CREATE POLICY "Authenticated users can insert cash records"
    ON public.cash_reconciliation
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Authenticated users can update cash records (for updating throughout the day)
CREATE POLICY "Authenticated users can update cash records"
    ON public.cash_reconciliation
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Admins can delete cash records
CREATE POLICY "Admins can delete cash records"
    ON public.cash_reconciliation
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- 5. MENU_ITEMS TABLE (if exists)
-- =====================================================

-- Enable RLS on menu_items table (if it exists)
ALTER TABLE IF EXISTS public.menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Authenticated users can insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can delete menu items" ON public.menu_items;

-- Policy: Anyone can read menu items
CREATE POLICY "Anyone can read menu items"
    ON public.menu_items
    FOR SELECT
    USING (true);

-- Policy: Authenticated users can insert menu items
CREATE POLICY "Authenticated users can insert menu items"
    ON public.menu_items
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Admins can update menu items
CREATE POLICY "Admins can update menu items"
    ON public.menu_items
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can delete menu items
CREATE POLICY "Admins can delete menu items"
    ON public.menu_items
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify RLS is enabled on all tables:

-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('users', 'sales', 'expenses', 'cash_reconciliation', 'menu_items');

-- View all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- =====================================================
-- SECURITY COMPLETE!
-- =====================================================
-- Your database is now secured with Row Level Security
-- 
-- Summary:
-- ✓ Users: Can only see their own data; admins see all
-- ✓ Sales: All authenticated can read/insert; only admins can update/delete
-- ✓ Expenses: All authenticated can read/insert; only admins can update/delete
-- ✓ Cash: All authenticated can read/insert/update; only admins can delete
-- ✓ Menu Items: Public read; authenticated insert; admins update/delete
-- =====================================================
