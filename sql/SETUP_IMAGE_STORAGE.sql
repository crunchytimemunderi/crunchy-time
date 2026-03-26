-- =====================================================
-- SETUP SUPABASE STORAGE FOR MENU ITEM IMAGES
-- =====================================================
-- This creates a storage bucket and policies for menu images
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create storage bucket for menu images (if not exists)
-- Note: You might need to create the bucket in Supabase Dashboard > Storage
-- Bucket name: menu-images
-- Public bucket: Yes (for easy image access)

-- Storage policies for menu-images bucket
-- Allow authenticated users to upload images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload menu images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete menu images" ON storage.objects;

-- Allow anyone to read images (public bucket)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'menu-images' );

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload menu images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'menu-images' );

-- Allow authenticated users to update their uploaded images
CREATE POLICY "Authenticated users can update menu images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'menu-images' );

-- Allow admins to delete images
CREATE POLICY "Admins can delete menu images"
ON storage.objects FOR DELETE
TO authenticated
USING ( 
  bucket_id = 'menu-images' 
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
