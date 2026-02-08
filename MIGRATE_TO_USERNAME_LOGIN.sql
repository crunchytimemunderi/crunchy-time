-- =====================================================
-- MIGRATE EXISTING EMAIL USERS TO USERNAME SYSTEM
-- =====================================================
-- This updates existing users to work with username-based login
-- =====================================================

-- STEP 1: Check current state
SELECT 
  u.id,
  u.email as users_email,
  au.email as auth_email,
  u.display_name,
  u.role,
  u.username,
  CASE 
    WHEN u.email = au.email THEN '✅ Emails match'
    ELSE '❌ Emails different'
  END as email_status
FROM users u
JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at;

-- STEP 2: Add username column if not exists (allow NULL initially)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username varchar(50);

-- STEP 3: Generate usernames from existing emails
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

-- STEP 4: Handle duplicates by appending numbers
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

-- STEP 5: Verify usernames created
SELECT 
  id,
  email,
  username,
  display_name,
  role
FROM users
ORDER BY created_at;

-- STEP 6: Update users table emails to new dummy format
UPDATE users
SET email = username || '@crunchy-times.local'
WHERE email NOT LIKE '%@crunchy-times.local';

-- STEP 7: Update auth.users emails to match new dummy format
-- CRITICAL: This updates the actual authentication emails
UPDATE auth.users au
SET email = u.email,
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{username}',
      to_jsonb(u.username)
    )
FROM users u
WHERE au.id = u.id
  AND au.email != u.email;

-- STEP 8: Make username required and unique
ALTER TABLE users 
ALTER COLUMN username SET NOT NULL;

ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_username_key;

ALTER TABLE users 
ADD CONSTRAINT users_username_key UNIQUE (username);

-- STEP 9: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================
SELECT 
  u.id,
  u.username,
  u.email as users_email,
  au.email as auth_email,
  u.display_name,
  u.role,
  CASE 
    WHEN u.email = au.email THEN '✅ Ready to login'
    ELSE '❌ Email mismatch'
  END as status
FROM users u
JOIN auth.users au ON u.id = au.id
ORDER BY u.created_at;

-- =====================================================
-- TEST YOUR ADMIN LOGIN
-- =====================================================
-- If your admin email was: admin@crunchytime.com
-- Your new username will be: admincrunchytime
-- Login with:
--   Username: admincrunchytime
--   Password: (your existing password)

-- To find your username, run:
SELECT 
  username,
  email,
  display_name,
  role
FROM users
WHERE role = 'admin'
ORDER BY created_at
LIMIT 1;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- If something goes wrong, you can rollback the email changes:
-- 
-- UPDATE auth.users au
-- SET email = (SELECT email FROM users WHERE id = au.id)
-- WHERE au.email LIKE '%@crunchy-times.local';
