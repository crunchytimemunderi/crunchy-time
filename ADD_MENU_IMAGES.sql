-- =====================================================
-- ADD IMAGE SUPPORT AND CATEGORIES TO MENU ITEMS
-- =====================================================
-- This adds an image_url column and category column to menu items
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add image_url column to menu_items table
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add category column to menu_items table
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Main Dishes';

-- Add comments to describe the columns
COMMENT ON COLUMN public.menu_items.image_url IS 'URL or path to the menu item image';
COMMENT ON COLUMN public.menu_items.category IS 'Category group for organizing menu items (e.g., Main Dishes, Sides, Beverages)';
