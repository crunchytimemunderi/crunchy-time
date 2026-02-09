-- Fix menu_items price constraint to allow 0 values
-- This removes any CHECK constraint that prevents price = 0

-- First, let's check if there's a constraint (for documentation)
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_schema = 'public' 
-- AND table_name = 'menu_items';

-- Drop any existing price constraints
-- Common constraint names:
DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find and drop all check constraints on menu_items that involve 'price'
    FOR constraint_record IN 
        SELECT con.conname
        FROM pg_constraint con
        INNER JOIN pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
        AND rel.relname = 'menu_items'
        AND con.contype = 'c'  -- CHECK constraint
        AND pg_get_constraintdef(con.oid) ILIKE '%price%'
    LOOP
        EXECUTE format('ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
        RAISE NOTICE 'Dropped constraint: %', constraint_record.conname;
    END LOOP;
END $$;

-- Add a new constraint that allows price >= 0 (including 0)
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_price_check;
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_price_positive;
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS check_price_positive;

-- Add the correct constraint: price must be >= 0 (allows 0)
ALTER TABLE menu_items 
ADD CONSTRAINT menu_items_price_non_negative 
CHECK (price >= 0);

-- Verify the constraint
SELECT 
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
AND rel.relname = 'menu_items'
AND con.contype = 'c'
AND pg_get_constraintdef(con.oid) ILIKE '%price%';

-- Test: These should work now
-- INSERT INTO menu_items (name, price, category) VALUES ('Free Sample', 0, 'Appetizers');
-- UPDATE menu_items SET price = 0 WHERE name = 'Free Sample';
