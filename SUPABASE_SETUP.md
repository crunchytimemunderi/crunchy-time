# Supabase Setup Guide for Crunchy Times

## Overview
This document outlines the Supabase database schema and setup instructions for the Crunchy Times application.

## Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_ADMIN_EMAIL=admin@example.com
```

Get these values from: https://app.supabase.com/project/_/settings/api

## Database Schema

### 1. Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

### 2. Sales Table

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi')),
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  created_by_name TEXT NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_created_by ON sales(created_by);
CREATE INDEX idx_sales_payment_method ON sales(payment_method);

-- Enable Row Level Security
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own sales, admins can read all
CREATE POLICY "Users can read own sales"
  ON sales FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Policy: Authenticated users can insert sales
CREATE POLICY "Users can insert sales"
  ON sales FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own sales, admins can delete all
CREATE POLICY "Users can delete own sales"
  ON sales FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

### 3. Expenses Table

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL CHECK (category IN ('chicken', 'oil', 'masala', 'gas', 'wages', 'other')),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('cash', 'upi')),
  description TEXT NOT NULL,
  bill_photo_url TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  created_by_name TEXT NOT NULL
);

-- Create indexes
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_created_by ON expenses(created_by);
CREATE INDEX idx_expenses_payment_mode ON expenses(payment_mode);
CREATE INDEX idx_expenses_category ON expenses(category);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own expenses, admins can read all
CREATE POLICY "Users can read own expenses"
  ON expenses FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Policy: Authenticated users can insert expenses
CREATE POLICY "Users can insert expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their own expenses, admins can delete all
CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

### 4. Inventory Table

```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('chicken', 'oil', 'masala', 'gas', 'packaging', 'other')),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  stock_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'litre', 'piece', 'packet', 'box')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_inventory_item_name ON inventory(item_name);
CREATE INDEX idx_inventory_category ON inventory(category);

-- Enable Row Level Security
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read inventory
CREATE POLICY "Users can read inventory"
  ON inventory FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Only admins can insert inventory items
CREATE POLICY "Admins can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Policy: Only admins can update inventory items
CREATE POLICY "Admins can update inventory"
  ON inventory FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Policy: Only admins can delete inventory items
CREATE POLICY "Admins can delete inventory"
  ON inventory FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

### 5. Cash Reconciliation Table

```sql
CREATE TABLE cash_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  opening_cash NUMERIC(10, 2) NOT NULL,
  cash_sales NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cash_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0,
  expected_closing_cash NUMERIC(10, 2) NOT NULL,
  actual_closing_cash NUMERIC(10, 2) NOT NULL,
  difference NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  created_by_name TEXT NOT NULL
);

-- Create index
CREATE INDEX idx_cash_reconciliation_date ON cash_reconciliation(date);

-- Enable Row Level Security
ALTER TABLE cash_reconciliation ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read cash reconciliation
CREATE POLICY "Only admins can read reconciliation"
  ON cash_reconciliation FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Policy: Only admins can insert cash reconciliation
CREATE POLICY "Only admins can insert reconciliation"
  ON cash_reconciliation FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Policy: Only admins can update cash reconciliation
CREATE POLICY "Only admins can update reconciliation"
  ON cash_reconciliation FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Policy: Only admins can delete cash reconciliation
CREATE POLICY "Only admins can delete reconciliation"
  ON cash_reconciliation FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

## Storage Setup

### Create Storage Bucket for Expense Bills

1. Go to Storage in Supabase Dashboard
2. Create a new bucket named `expense-bills`
3. Set it to **Public** (or configure policies for private access)

### Storage Policies (if using private bucket)

```sql
-- Policy: Users can upload their own bill photos
CREATE POLICY "Users can upload bill photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'expense-bills' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can read bill photos
CREATE POLICY "Users can read bill photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'expense-bills');

-- Policy: Users can delete their own bill photos
CREATE POLICY "Users can delete own bill photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'expense-bills' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Authentication Setup

### 1. Enable Email Authentication

1. Go to Authentication → Providers in Supabase Dashboard
2. Enable **Email** provider
3. Configure email templates if needed

### 2. Create Users

For each user (admin and staff):

1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. After creating, insert a record in the `users` table:

```sql
-- For Admin User
INSERT INTO users (id, email, display_name, role)
VALUES (
  'user-uuid-from-auth-users',
  'admin@example.com',
  'Admin Name',
  'admin'
);

-- For Staff User
INSERT INTO users (id, email, display_name, role)
VALUES (
  'user-uuid-from-auth-users',
  'staff@example.com',
  'Staff Name',
  'staff'
);
```

### 3. Enable Realtime (Optional but Recommended)

1. Go to Database → Replication
2. Enable replication for tables:
   - `sales`
   - `expenses`
   - `cash_reconciliation`

This enables real-time updates across the application.

## Testing the Setup

1. **Test Authentication:**
   - Try logging in with created user credentials
   - Verify user data is fetched correctly

2. **Test Sales Entry:**
   - Create a sale record
   - Verify it appears in the dashboard
   - Test deletion

3. **Test Expenses:**
   - Create an expense with a photo
   - Verify photo uploads to Storage
   - Check photo URL is saved correctly

4. **Test Cash Reconciliation (Admin only):**
   - Create a reconciliation record
   - Verify calculations are correct
   - Test update and delete

## Migration Notes

### Differences from Firebase:

1. **IDs:** Supabase uses UUID instead of auto-generated document IDs
2. **Field Names:** Snake_case (e.g., `created_at`) instead of camelCase
3. **Timestamps:** PostgreSQL `TIMESTAMPTZ` instead of Firebase Timestamp
4. **Queries:** SQL-based filtering instead of Firestore query chains
5. **Storage:** Public URLs by default (can be configured for private)
6. **Realtime:** Subscribed via channels instead of `onSnapshot()`

### Key Benefits:

- ✅ PostgreSQL relational database with ACID compliance
- ✅ Built-in Row Level Security (RLS)
- ✅ Better querying capabilities with SQL
- ✅ Open source and self-hostable
- ✅ More cost-effective for larger datasets
- ✅ Better TypeScript support with generated types

## Next Steps

1. Create a Supabase project at https://supabase.com
2. Run the SQL commands above in the SQL Editor
3. Set up Storage bucket for expense bills
4. Create authentication users
5. Add user records in the users table
6. Update `.env.local` with your Supabase credentials
7. Test the application!

## Troubleshooting

### "User data not found" Error
- Ensure a record exists in the `users` table for the authenticated user
- Verify the `id` in users table matches the auth user's `id`

### Storage Upload Failures
- Check if `expense-bills` bucket exists
- Verify bucket is set to Public or has proper RLS policies
- Ensure file size is under bucket limits

### Realtime Not Working
- Enable replication for the tables in Database → Replication
- Check if channel subscriptions are active
- Verify network connection and Supabase project status
