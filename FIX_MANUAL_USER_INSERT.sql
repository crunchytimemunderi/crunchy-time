-- =====================================================
-- FIX MANUAL USER INSERTION IN SUPABASE TABLE EDITOR
-- =====================================================
-- This allows adding users via Supabase UI without username errors
-- =====================================================

-- STEP 1: Make username nullable temporarily
ALTER TABLE users 
ALTER COLUMN username DROP NOT NULL;

-- STEP 2: Create a trigger function to auto-generate username from email
CREATE OR REPLACE FUNCTION generate_username_from_email()
RETURNS TRIGGER AS $$
BEGIN
  -- If username is null or empty, generate it from email
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := LOWER(
      REGEXP_REPLACE(
        SPLIT_PART(NEW.email, '@', 1),
        '[^a-z0-9_]',
        '',
        'g'
      )
    );
    
    -- Handle duplicates by appending a random number
    WHILE EXISTS (SELECT 1 FROM users WHERE username = NEW.username AND id != NEW.id) LOOP
      NEW.username := NEW.username || floor(random() * 1000)::text;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Create trigger to run before insert or update
DROP TRIGGER IF EXISTS ensure_username_trigger ON users;

CREATE TRIGGER ensure_username_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION generate_username_from_email();

-- STEP 4: Fix any existing users with null usernames
UPDATE users 
SET username = LOWER(
  REGEXP_REPLACE(
    SPLIT_PART(email, '@', 1),
    '[^a-z0-9_]',
    '',
    'g'
  )
)
WHERE username IS NULL OR username = '';

-- Handle any duplicates that might have been created
WITH duplicates AS (
  SELECT 
    id,
    username,
    ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
  FROM users
  WHERE username IS NOT NULL
)
UPDATE users u
SET username = u.username || CAST(d.rn AS text)
FROM duplicates d
WHERE u.id = d.id 
  AND d.rn > 1;

-- STEP 5: Now make username required again
ALTER TABLE users 
ALTER COLUMN username SET NOT NULL;

-- STEP 6: Ensure unique constraint exists
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_username_key;

ALTER TABLE users 
ADD CONSTRAINT users_username_key UNIQUE (username);

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 
  id,
  email,
  username,
  display_name,
  role,
  CASE 
    WHEN username IS NOT NULL THEN '✅ Has username'
    ELSE '❌ Missing username'
  END as status
FROM users
ORDER BY created_at DESC;

-- =====================================================
-- NOW YOU CAN ADD USERS IN SUPABASE TABLE EDITOR
-- =====================================================
-- When adding a new user:
-- 1. Leave username field empty (it will auto-generate from email)
-- 2. Or provide a username manually
-- 
-- Example:
-- email: john@example.com  → username will be: john (or johnexample)
-- email: admin@crunchytime.com → username will be: admincrunchytime
