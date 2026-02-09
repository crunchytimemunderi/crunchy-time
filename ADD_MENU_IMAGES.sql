-- =====================================================
-- ADD IMAGE SUPPORT TO MENU ITEMS
-- =====================================================
-- This adds an image_url column to store menu item images
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add image_url column to menu_items table
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN public.menu_items.image_url IS 'URL or path to the menu item image';
