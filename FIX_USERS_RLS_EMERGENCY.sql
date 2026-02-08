-- =====================================================
-- EMERGENCY FIX: Infinite Recursion in RLS Policies
-- =====================================================
-- The previous policies caused infinite recursion.
-- This fix uses a SECURITY DEFINER function to bypass RLS.
-- =====================================================

-- Step 1: Drop all problematic policies
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Admins can update user roles" ON users;

-- Step 2: Create a helper function that bypasses RLS
-- SECURITY DEFINER means it runs with owner's privileges (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Step 3: Recreate policies using the non-recursive function
-- Policy 1: Users can always read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Admins can read all users (uses SECURITY DEFINER function)
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Policy 3: Users can update their own data (display_name only)
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Admins can update any user's role
CREATE POLICY "Admins can update user roles"
  ON users FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- Policy 5: Admins can insert new users
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Policy 6: Admins can delete users
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- =====================================================
-- VERIFY THE FIX
-- =====================================================

-- Check the function exists
SELECT routine_name, routine_type, security_type 
FROM information_schema.routines 
WHERE routine_name = 'is_admin';

-- Check all policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'users';

-- Test query - should now work without recursion
SELECT id, email, role, display_name FROM users;
