-- =====================================================
-- CREATE MENU ITEMS TABLE
-- =====================================================
-- This table stores your menu items (Full Chicken, Half Chicken, etc.)
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create menu_items table
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(name)
);

-- Enable Row Level Security
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
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
-- INSERT DEFAULT MENU ITEMS (Optional)
-- =====================================================
-- Add some common fried chicken shop items
-- Modify prices according to your shop
-- =====================================================

INSERT INTO public.menu_items (name, price) VALUES
    ('Full Chicken', 350.00),
    ('Half Chicken', 180.00),
    ('Quarter Chicken', 95.00),
    ('6 Pieces', 150.00),
    ('3 Pieces', 80.00),
    ('1 Piece', 30.00),
    ('Chicken Burger', 60.00),
    ('Chicken Roll', 50.00)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- VERIFY
-- =====================================================
SELECT * FROM public.menu_items ORDER BY price DESC;
