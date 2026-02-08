# 🔐 User Permissions Guide

## Role Overview

### 👑 Admin Role

**Full system access with all privileges**

#### Dashboard & Navigation

- ✅ View Dashboard with all statistics
- ✅ Access all menu items
- ✅ View system-wide data

#### Sales & Expenses

- ✅ Add new sales
- ✅ Add new expenses
- ✅ View all sales (all users)
- ✅ View all expenses (all users)
- ✅ Edit any sale record
- ✅ Edit any expense record
- ✅ Delete any sale record
- ✅ Delete any expense record

#### Cash Reconciliation

- ✅ Perform daily reconciliation
- ✅ View reconciliation history
- ✅ Edit past reconciliation records
- ✅ Edit opening balances
- ✅ Delete reconciliation records
- ✅ Override auto-calculated values

#### Inventory Management

- ✅ View inventory
- ✅ Add inventory items
- ✅ Edit inventory items
- ✅ Delete inventory items
- ✅ Adjust stock levels

#### User Management

- ✅ View all users
- ✅ Create new users
- ✅ Edit user roles
- ✅ Delete users
- ✅ View permissions
- ✅ Manage access control

---

### 👤 Staff Role

**Limited access for daily operations**

#### Dashboard & Navigation

- ✅ View Dashboard (limited statistics)
- ✅ Access Sales menu
- ✅ Access Expenses menu
- ❌ Cannot access Cash Reconciliation
- ❌ Cannot access Inventory
- ❌ Cannot access User Management

#### Sales & Expenses

- ✅ Add new sales
- ✅ Add new expenses
- ✅ View own sales only
- ✅ View own expenses only
- ❌ Cannot view other users' records
- ❌ Cannot edit any records (including own)
- ❌ Cannot delete any records

#### Cash Reconciliation

- ❌ Cannot perform reconciliation
- ❌ Cannot view reconciliation records
- ❌ Cannot edit reconciliation data
- ❌ No access to this feature

#### Inventory Management

- ❌ Cannot view inventory
- ❌ Cannot add/edit/delete items
- ❌ No access to this feature

#### User Management

- ❌ Cannot view user list
- ❌ Cannot create users
- ❌ Cannot edit roles
- ❌ No access to this feature

---

## Feature Access Matrix

| Feature                 | Admin | Staff |
| ----------------------- | ----- | ----- |
| **Dashboard**           |
| View Dashboard          | ✅    | ✅    |
| View All Statistics     | ✅    | ❌    |
| **Sales**               |
| Add Sales               | ✅    | ✅    |
| View All Sales          | ✅    | ❌    |
| View Own Sales          | ✅    | ✅    |
| Edit Sales              | ✅    | ❌    |
| Delete Sales            | ✅    | ❌    |
| **Expenses**            |
| Add Expenses            | ✅    | ✅    |
| View All Expenses       | ✅    | ❌    |
| View Own Expenses       | ✅    | ✅    |
| Edit Expenses           | ✅    | ❌    |
| Delete Expenses         | ✅    | ❌    |
| **Cash Reconciliation** |
| Perform Reconciliation  | ✅    | ❌    |
| View History            | ✅    | ❌    |
| Edit Past Records       | ✅    | ❌    |
| Delete Records          | ✅    | ❌    |
| **Inventory**           |
| View Inventory          | ✅    | ❌    |
| Manage Inventory        | ✅    | ❌    |
| **User Management**     |
| View Users              | ✅    | ❌    |
| Create Users            | ✅    | ❌    |
| Edit Roles              | ✅    | ❌    |
| Delete Users            | ✅    | ❌    |

---

## Security Features

### Admin Protections

1. **Self-Protection**: Admins cannot change their own role
2. **Self-Preservation**: Admins cannot delete their own account
3. **Audit Trail**: All actions are logged with user ID and timestamp

### Staff Limitations

1. **Data Isolation**: Can only see own sales and expenses
2. **Historical Protection**: Cannot edit past reconciliation data
3. **No Deletion Rights**: Cannot delete any records
4. **No User Management**: Cannot view or modify other users

### System-Wide

1. **Row Level Security (RLS)**: Database enforces permissions
2. **Middleware Protection**: Routes blocked at server level
3. **Component Guards**: UI elements hidden based on role
4. **API Validation**: All operations validated server-side

---

## Implementation Details

### Frontend Checks

```typescript
// Check if user is admin
const isAdmin = userData?.role === "admin";

// Conditional rendering
{isAdmin && <AdminOnlyFeature />}

// Conditional access
if (userData?.role !== "admin") {
  showError("Access denied");
  return;
}
```

### Backend RLS Policies

```sql
-- Example: Admins can read all users
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Example: Staff can only read own sales
CREATE POLICY "Users can read own sales"
  ON sales FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

### Middleware Routes

```typescript
// Admin-only routes
const adminOnlyRoutes = ["/cash", "/inventory", "/users"];

// Route protection logic
if (adminOnlyRoutes.includes(pathname) && role !== "admin") {
  return NextResponse.redirect("/dashboard");
}
```

---

## How to Create a New User

### As Admin:

1. Navigate to **User Management** (from Dashboard or menu)
2. Click **➕ Create New User** button
3. Fill in:
   - **Email**: User's email address
   - **Password**: Minimum 6 characters (user can change later)
   - **Display Name**: Full name (shown in UI)
   - **Role**: Choose Admin or Staff
4. Click **Create User**
5. User receives email confirmation (if enabled in Supabase)
6. User can login immediately with provided credentials

### Field Requirements:

- **Email**: Must be valid email format, unique in system
- **Password**: Minimum 6 characters
- **Display Name**: Any text (used throughout UI)
- **Role**: Admin (full access) or Staff (limited access)

---

## How to Change User Role

### As Admin:

1. Go to **User Management**
2. Find user in table
3. Click **Edit** button next to user
4. Select new role from dropdown (Admin or Staff)
5. Click **Save**
6. Changes take effect immediately
7. User must **log out and log back in** for UI changes

### Notes:

- ⚠️ You cannot edit your own role (security protection)
- ⚠️ Role changes affect permissions immediately
- ⚠️ User may lose access to current page if downgraded

---

## How to Delete a User

### As Admin:

1. Go to **User Management**
2. Find user in table
3. Click **Delete** button
4. Confirm deletion in popup
5. User removed from system

### Notes:

- ⚠️ You cannot delete your own account
- ⚠️ This action cannot be undone
- ⚠️ User's auth account remains in Supabase (won't have access without users table entry)
- ⚠️ User's historical data (sales, expenses) remains in database

---

## Permission Troubleshooting

### User Can't Access Feature

1. Check role in User Management
2. Verify role is "admin" for admin features
3. Ask user to log out and log back in
4. Check RLS policies in Supabase

### User Sees Feature But Gets Error

1. Check RLS policies in database
2. Verify middleware.ts has correct routes
3. Check ProtectedRoute component
4. Review console for specific error

### New User Can't Login

1. Verify user exists in users table
2. Check email confirmation requirement in Supabase
3. Verify password was set correctly
4. Check Supabase auth logs

---

## Best Practices

### For Admins:

1. ✅ Give minimum required permissions (prefer Staff when possible)
2. ✅ Regularly review user list
3. ✅ Remove inactive users
4. ✅ Use strong passwords when creating accounts
5. ✅ Test new user accounts before sharing credentials

### For Staff:

1. ✅ Only add sales/expenses for your own transactions
2. ✅ Report any access issues to admin
3. ✅ Don't share login credentials
4. ✅ Log out when finished

### For Development:

1. ✅ Always check role before rendering sensitive UI
2. ✅ Enforce permissions at database level (RLS)
3. ✅ Validate role in middleware for protected routes
4. ✅ Log permission-related errors for debugging
5. ✅ Test with both admin and staff accounts

---

## Future Permission Enhancements

### Potential Additions:

- 🔮 Custom roles beyond Admin/Staff
- 🔮 Granular permissions per feature
- 🔮 Temporary access grants
- 🔮 View-only admin role
- 🔮 Department-based access
- 🔮 Time-based permissions

---

Last Updated: February 4, 2026
