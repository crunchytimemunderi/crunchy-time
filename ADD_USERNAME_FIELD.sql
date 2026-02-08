-- =====================================================
-- ADD USERNAME FIELD TO USERS TABLE
-- =====================================================
-- Replace email with username for user creation
-- =====================================================

-- Add username column to users table (allow NULL initially)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username varchar(50);

-- Update existing users to have username (use email prefix)
UPDATE users 
SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-z0-9_]', '', 'g'))
WHERE username IS NULL OR username = '';

-- Handle duplicates by appending user ID last 4 chars if needed
UPDATE users u1
SET username = username || '_' || SUBSTRING(u1.id::text, 1, 4)
WHERE EXISTS (
  SELECT 1 FROM users u2 
  WHERE u2.username = u1.username 
  AND u2.id < u1.id
);

-- Now make username required
ALTER TABLE users 
ALTER COLUMN username SET NOT NULL;

-- Add unique constraint
ALTER TABLE users 
ADD CONSTRAINT users_username_key UNIQUE (username);

-- Add index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Comment on the column
COMMENT ON COLUMN users.username IS 
'Unique username for login (no email required). Format: alphanumeric, 3-50 characters.';

-- =====================================================
-- VERIFY
-- =====================================================
SELECT 
  id,
  username,
  email,
  display_name,
  role,
  created_at
FROM users
ORDER BY created_at DESC;
