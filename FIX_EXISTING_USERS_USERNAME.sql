-- =====================================================
-- FIX EXISTING USERS - ADD USERNAMES
-- =====================================================
-- Run this if you get "null value in column username" error
-- =====================================================

-- STEP 1: Check current user data
SELECT 
  id,
  email,
  display_name,
  role,
  username,
  CASE 
    WHEN username IS NULL OR username = '' THEN '❌ No username'
    ELSE '✅ Has username'
  END as status
FROM users
ORDER BY created_at;

-- STEP 2: Drop NOT NULL constraint if it exists (to allow updates)
ALTER TABLE users 
ALTER COLUMN username DROP NOT NULL;

-- STEP 3: Drop UNIQUE constraint if it exists
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_username_key;

-- STEP 4: Update all users with usernames based on email
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

-- STEP 5: Handle any duplicates by appending part of user ID
WITH duplicates AS (
  SELECT 
    id,
    username,
    ROW_NUMBER() OVER (PARTITION BY username ORDER BY created_at) as rn
  FROM users
  WHERE username IS NOT NULL
)
UPDATE users u
SET username = u.username || '_' || SUBSTRING(u.id::text, 1, 4)
FROM duplicates d
WHERE u.id = d.id 
  AND d.rn > 1;

-- STEP 6: Verify all users have usernames
SELECT 
  id,
  email,
  username,
  display_name,
  CASE 
    WHEN username IS NULL OR username = '' THEN '❌ Still missing'
    ELSE '✅ Good'
  END as status
FROM users
ORDER BY created_at;

-- STEP 7: Now make username required
ALTER TABLE users 
ALTER COLUMN username SET NOT NULL;

-- STEP 8: Add unique constraint back
ALTER TABLE users 
ADD CONSTRAINT users_username_key UNIQUE (username);

-- STEP 9: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================
SELECT 
  'Total Users' as metric,
  COUNT(*) as count
FROM users
UNION ALL
SELECT 
  'Users with Username' as metric,
  COUNT(*) as count
FROM users
WHERE username IS NOT NULL AND username != ''
UNION ALL
SELECT 
  'Users without Username' as metric,
  COUNT(*) as count
FROM users
WHERE username IS NULL OR username = '';
