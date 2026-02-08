# Navigation & Access Control

## Overview
The app uses role-based access control (RBAC) with Firebase Authentication to manage user permissions.

## Roles
- **Admin**: Full access to all features (wife/owner)
- **Staff**: Limited access to dashboard and sales only (store staff)

## Navigation Component

### Location
`components/Navbar.tsx`

### Features
- **Responsive Design**: Mobile hamburger menu + desktop horizontal nav
- **Role-Based Links**: Shows only authorized links based on user role
- **Active State**: Highlights current page
- **User Info**: Displays name and role
- **Logout Button**: Secure sign out functionality
- **Auto-Hide**: Hidden on login and home pages

### Navigation Links

| Link | Icon | Route | Admin | Staff |
|------|------|-------|-------|-------|
| Dashboard | 📊 | /dashboard | ✅ | ✅ |
| Sales | 💰 | /sales | ✅ | ✅ |
| Expenses | 📝 | /expenses | ✅ | ❌ |
| Cash | 💵 | /cash | ✅ | ❌ |

## Middleware Protection

### Location
`middleware.ts`

### How It Works
1. **Cookie-Based Auth**: Reads `userRole` cookie set by auth-context
2. **Public Routes**: `/` and `/login` accessible without authentication
3. **Auto-Redirect**: Logged-in users redirected from `/login` to `/dashboard`
4. **Protected Routes**: All other routes require authentication
5. **Role Enforcement**: 
   - `/expenses` and `/cash` → Admin only
   - `/dashboard` and `/sales` → Admin + Staff
6. **Unauthorized Access**: Redirects to dashboard with error message

### Middleware Flow
```
Request → Check Cookie → Public Route? → Allow
                      ↓
                  No Cookie? → Redirect to /login?redirect={path}
                      ↓
              Admin Route & Not Admin? → Redirect to /dashboard?error=unauthorized
                      ↓
                    Allow
```

## Client-Side Protection

### ProtectedRoute Component
`components/ProtectedRoute.tsx`

- Wraps page components requiring authentication
- Can specify `requiredRole` prop for admin-only pages
- Shows loading spinner during auth check
- Redirects to login if not authenticated
- Redirects to dashboard if wrong role

### Usage Examples
```tsx
// Any authenticated user
<ProtectedRoute>
  <DashboardContent />
</ProtectedRoute>

// Admin only
<ProtectedRoute requiredRole="admin">
  <ExpensesContent />
</ProtectedRoute>
```

## Authentication Context

### Location
`lib/auth-context.tsx`

### Provides
- `user`: Firebase user object
- `userData`: User document from Firestore (includes role)
- `signIn(email, password)`: Login function
- `signOut()`: Logout function
- `hasRole(role)`: Check if user has specific role

### Role Storage
- **Cookie**: `userRole` (for middleware)
- **Firestore**: `users/{uid}` collection with role field

## Access Control Summary

| Page | Route | Protection Level | Notes |
|------|-------|------------------|-------|
| Home | / | Public | Auto-redirects if logged in |
| Login | /login | Public | Auto-redirects to dashboard if logged in |
| Dashboard | /dashboard | Authenticated | All roles |
| Sales | /sales | Authenticated | All roles |
| Expenses | /expenses | Admin Only | Middleware + ProtectedRoute |
| Cash | /cash | Admin Only | Middleware + ProtectedRoute |

## Error Handling

### Unauthorized Access
When a staff user tries to access admin pages:
1. Middleware catches the attempt
2. Redirects to `/dashboard?error=unauthorized`
3. Dashboard displays error message
4. Error auto-dismisses after 5 seconds

### Session Expiration
- Firebase handles token refresh automatically
- Cookie is updated on auth state changes
- Expired sessions redirect to login

## Security Best Practices

✅ **Double Protection**: Both middleware (server) and ProtectedRoute (client)
✅ **Cookie Security**: HttpOnly would be ideal (requires API route)
✅ **Role Verification**: Firestore security rules should also enforce roles
✅ **Redirect Tracking**: Login page supports `redirect` parameter
✅ **Auto Logout**: Clears cookies and Firebase session

## Firestore Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to check if user is owner of document
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Users collection - users can read their own data
    match /users/{userId} {
      allow read: if isSignedIn() && isOwner(userId);
      allow write: if isAdmin();
    }
    
    // Sales - staff can create their own, admin can do everything
    match /sales/{saleId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isAdmin() || isOwner(resource.data.createdBy);
    }
    
    // Expenses - admin only
    match /expenses/{expenseId} {
      allow read, write: if isAdmin();
    }
    
    // Cash Reconciliation - admin only
    match /cashReconciliation/{recId} {
      allow read, write: if isAdmin();
    }
  }
}
```

## Testing Access Control

### Test Cases
1. **Staff Login** → Should see Dashboard, Sales only
2. **Staff tries /expenses** → Redirected to dashboard with error
3. **Staff tries /cash** → Redirected to dashboard with error
4. **Admin Login** → Should see all navigation links
5. **Logged out user** → Any protected route redirects to login
6. **Logout** → Clears cookies, redirects to login

## Troubleshooting

### Issue: Navbar not showing
- Check if user is authenticated
- Verify not on `/` or `/login` routes
- Check browser console for errors

### Issue: Getting "unauthorized" error as admin
- Verify `userRole` cookie is set to "admin"
- Check Firestore users collection has correct role
- Try logout and login again

### Issue: Redirected to login repeatedly
- Check cookie is being set in auth-context
- Verify middleware is reading cookie correctly
- Check Firebase Auth session is valid

## Future Enhancements

- [ ] Add "Remember Me" functionality
- [ ] Implement password reset flow
- [ ] Add user management page (admin only)
- [ ] Session timeout warnings
- [ ] Audit log for admin actions
- [ ] Two-factor authentication
