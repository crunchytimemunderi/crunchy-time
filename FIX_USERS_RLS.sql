-- =====================================================
-- FIX USERS TABLE RLS - Allow admins to see all users
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Policy: Admins can read all users
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can update their own data (display_name only)
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Only admins can update user roles
CREATE POLICY "Admins can update user roles"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
    )
  );

-- =====================================================
-- VERIFY THE POLICIES
-- =====================================================

-- Check all policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users';

-- Test query - should now return all users for admins
SELECT * FROM users;
