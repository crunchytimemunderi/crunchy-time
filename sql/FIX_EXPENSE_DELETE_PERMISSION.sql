-- =====================================================
-- FIX EXPENSES DELETE PERMISSION FOR STAFF
-- =====================================================
-- Allow staff to delete expenses if they have canDeleteExpenses permission
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop old admin-only delete policy
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;

-- Create new policy that checks both admin OR canDeleteExpenses permission
CREATE POLICY "Can delete expenses if admin or has permission"
    ON public.expenses
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (
                users.role = 'admin'
                OR (custom_permissions @> '["canDeleteExpenses"]'::jsonb)
            )
        )
    );

-- Verify policy is in place
SELECT policy_name, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'expenses' AND cmd = 'DELETE';

-- =====================================================
-- DONE! Staff with canDeleteExpenses permission can now delete expenses
-- =====================================================
