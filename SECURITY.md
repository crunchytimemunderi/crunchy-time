# Page Protection & Security

## Overview
The Crunchy Times application uses a multi-layered security approach to protect routes and ensure proper access control.

## Security Layers

### 1. Middleware (Server-Side Protection)
**File:** [middleware.ts](middleware.ts)

The middleware runs on the Edge Runtime before pages load, providing the first line of defense.

**Public Routes (No Auth Required):**
- `/` - Home page
- `/login` - Login page
- `/test` - Database test page
- `/test-login` - Authentication test page

**Protected Routes:**
- All other routes require authentication
- Unauthenticated users are redirected to `/login`

**Role-Based Access:**

**Admin Only:**
- `/cash` - Cash reconciliation

**Admin & Staff Access:**
- `/dashboard` - Main dashboard
- `/sales` - Sales entry
- `/expenses` - Expense tracking
- `/reports` - Reports (placeholder)
- `/settings` - User settings

### 2. ProtectedRoute Component (Client-Side Protection)
**File:** [components/ProtectedRoute.tsx](components/ProtectedRoute.tsx)

Wraps page components to add client-side authentication checks.

**Usage:**
```tsx
import ProtectedRoute from '@/components/ProtectedRoute';

export default function MyPage() {
  return (
    <ProtectedRoute>
      <MyPageContent />
    </ProtectedRoute>
  );
}
```

**Admin-Only Page:**
```tsx
export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminPageContent />
    </ProtectedRoute>
  );
}
```

### 3. Authentication Context
**File:** [lib/auth-context.tsx](lib/auth-context.tsx)

Provides global authentication state using Supabase Auth.

**Features:**
- Session persistence with localStorage
- Automatic token refresh
- User role management from `users` table
- Cookie-based role storage for middleware

**Hooks:**
```tsx
const { user, userData, loading, signIn, signOut, hasRole } = useAuth();
```

### 4. Row Level Security (Database)
**File:** [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

PostgreSQL policies ensure data security at the database level.

**Examples:**

**Sales Table:**
- Users can read their own sales
- Admins can read all sales
- Users can insert sales (with their ID)
- Users can delete their own sales

**Cash Reconciliation:**
- Only admins can read/write/update/delete

## Current Page Protection Status

✅ **Fully Protected Pages:**
- [app/dashboard/page.tsx](app/dashboard/page.tsx) - Uses ProtectedRoute
- [app/sales/page.tsx](app/sales/page.tsx) - Uses ProtectedRoute
- [app/expenses/page.tsx](app/expenses/page.tsx) - Uses ProtectedRoute
- [app/cash/page.tsx](app/cash/page.tsx) - Uses ProtectedRoute + Admin only
- [app/reports/page.tsx](app/reports/page.tsx) - Uses ProtectedRoute
- [app/settings/page.tsx](app/settings/page.tsx) - Uses ProtectedRoute

✅ **Public Pages:**
- [app/page.tsx](app/page.tsx) - Home page (public)
- [app/login/page.tsx](app/login/page.tsx) - Login page (public)
- [app/test/page.tsx](app/test/page.tsx) - Database test (public)
- [app/test-login/page.tsx](app/test-login/page.tsx) - Auth test (public)

## Access Control Matrix

| Page | Public | Staff | Admin |
|------|--------|-------|-------|
| `/` Home | ✅ | ✅ | ✅ |
| `/login` | ✅ | ❌* | ❌* |
| `/dashboard` | ❌ | ✅ | ✅ |
| `/sales` | ❌ | ✅ | ✅ |
| `/expenses` | ❌ | ✅ | ✅ |
| `/cash` | ❌ | ❌ | ✅ |
| `/reports` | ❌ | ✅ | ✅ |
| `/settings` | ❌ | ✅ | ✅ |
| `/test` | ✅ | ✅ | ✅ |
| `/test-login` | ✅ | ✅ | ✅ |

*Logged-in users are redirected to dashboard if they visit login page

## Security Features

### 1. Cookie-Based Role Storage
After successful login, user role is stored in a cookie:
```javascript
document.cookie = `userRole=${data.role}; path=/; max-age=604800`; // 7 days
```

This enables middleware to check roles without database queries.

### 2. Automatic Redirects
- Unauthenticated → `/login?redirect=<original-path>`
- Staff accessing admin routes → `/dashboard?error=unauthorized`
- Authenticated accessing `/login` → `/dashboard`

### 3. Loading States
ProtectedRoute shows a loading spinner while checking authentication, preventing flash of unauthorized content.

### 4. Error Handling
- Invalid credentials show user-friendly error messages
- Authorization errors display on dashboard
- Session expiry automatically redirects to login

## Data Security

### Supabase Row Level Security Policies

**Users Table:**
```sql
-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);
```

**Sales Table:**
```sql
-- Users can read own sales, admins can read all
CREATE POLICY "Users can read own sales"
  ON sales FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

**Cash Reconciliation:**
```sql
-- Only admins can access
CREATE POLICY "Only admins can read reconciliation"
  ON cash_reconciliation FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
```

## Best Practices

### When Adding New Pages

1. **Create the page component:**
```tsx
function MyPageContent() {
  return <div>My protected content</div>;
}
```

2. **Wrap with ProtectedRoute:**
```tsx
export default function MyPage() {
  return (
    <ProtectedRoute requiredRole="admin"> {/* if admin-only */}
      <MyPageContent />
    </ProtectedRoute>
  );
}
```

3. **Update middleware if needed:**
Add route to appropriate array in `middleware.ts`

4. **Add RLS policies:**
Create database policies in Supabase for data access

### Security Checklist

Before deploying:
- [ ] All sensitive pages use ProtectedRoute
- [ ] Middleware config is updated with new routes
- [ ] Database has RLS policies enabled
- [ ] Environment variables are secure
- [ ] Cookie expiry is appropriate (currently 7 days)
- [ ] Error messages don't leak sensitive information
- [ ] Supabase anon key is properly configured (read-only)

## Testing Security

1. **Test as unauthenticated user:**
   - Visit protected routes directly
   - Should redirect to login

2. **Test as staff:**
   - Try accessing `/cash`
   - Should redirect to dashboard with error

3. **Test as admin:**
   - Should have access to all routes
   - Verify all functionality works

4. **Test session expiry:**
   - Clear cookies and refresh
   - Should redirect to login

## Troubleshooting

### "User data not found" Error
- Check if user exists in `users` table
- Verify user ID matches auth.users ID
- Ensure role is set correctly

### Middleware Not Working
- Check cookie is being set after login
- Verify middleware config matcher pattern
- Clear browser cache and cookies

### Unauthorized Access
- Check RLS policies in Supabase
- Verify user role in database
- Check middleware route configuration

## Additional Security Recommendations

1. **Enable 2FA** (Future enhancement)
2. **Add rate limiting** for login attempts
3. **Log security events** (login, logout, unauthorized access)
4. **Regular security audits** of database policies
5. **Implement session timeout** for inactive users
6. **Add CSRF protection** for form submissions
