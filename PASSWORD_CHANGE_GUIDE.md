# Password Change Features

## Overview

The system now supports password management for both administrators and regular users.

## Features

### 1. Admin Password Reset (for any user)

**Location:** `/users` (User Management page)

**How to use:**

1. Navigate to User Management page
2. Find the user whose password you want to reset
3. Click the **🔑 Reset PW** button in the Actions column
4. Enter the new password (minimum 6 characters)
5. Click **Reset Password**
6. The new password will be displayed in a success message
7. Share the new password with the user securely

**Important Notes:**

- Admins can reset passwords for ANY user (including their own)
- The password change is immediate
- The new password is shown in the success message for easy sharing
- Users must use the new password on their next login

### 2. User Self-Service Password Change

**Location:** `/settings/password` (Settings → Security → Change Password)

**How to use:**

1. Navigate to Settings page from the dashboard
2. Click on **🔑 Change Password** under Security section
3. Enter your current password
4. Enter your new password (minimum 6 characters)
5. Confirm the new password
6. Click **Change Password**

**Password Requirements:**

- Minimum 6 characters
- Must be different from current password
- Both new password fields must match

**Important Notes:**

- Users verify their identity by entering current password
- Users remain logged in after changing password
- If users forget their password, they must contact an admin for reset

## Security Features

### Admin Password Reset

- Uses Supabase Admin API (`supabase.auth.admin.updateUserById`)
- Requires admin role to access User Management page
- No verification of old password needed (admin override)
- Password displayed in success message for secure transmission to user

### User Password Change

- Verifies current password before allowing change
- Uses standard Supabase auth update (`supabase.auth.updateUser`)
- Protected by authentication requirement
- Session remains active after password change

## Access Control

| Feature                                 | Admin  | Staff  |
| --------------------------------------- | ------ | ------ |
| Reset any user's password               | ✅ Yes | ❌ No  |
| Change own password                     | ✅ Yes | ✅ Yes |
| View password change option in settings | ✅ Yes | ✅ Yes |

## Technical Implementation

### Admin Password Reset Flow:

```
1. Admin clicks "Reset PW" button
2. Modal opens with password input
3. Admin enters new password
4. System calls: supabase.auth.admin.updateUserById(userId, { password: newPassword })
5. Success message displays new password
6. User can login with new password immediately
```

### User Password Change Flow:

```
1. User navigates to /settings/password
2. User enters current password, new password, and confirmation
3. System verifies current password with signInWithPassword
4. If valid, system calls: supabase.auth.updateUser({ password: newPassword })
5. Success message shown
6. Form cleared
7. User remains logged in
```

## Files Modified/Created

### Modified:

- `app/users/page.tsx` - Added password reset functionality for admins
- `lib/auth-context.tsx` - Added `username` field to UserData interface
- `app/settings/page.tsx` - Added link to password change page

### Created:

- `app/settings/password/page.tsx` - New page for users to change their own password

## Error Handling

### Common Errors and Solutions:

**"Current password is incorrect"**

- User entered wrong current password
- Solution: Double-check current password

**"Password must be at least 6 characters"**

- Password too short
- Solution: Enter password with minimum 6 characters

**"New passwords do not match"**

- Confirmation field doesn't match new password
- Solution: Re-enter passwords carefully

**"Failed to reset password. Make sure you have admin privileges."**

- Non-admin trying to use admin reset feature
- Solution: Ensure user has admin role in database

**"New password must be different from current password"**

- User tried to use same password
- Solution: Choose a different password

## Best Practices

### For Admins:

1. Always use strong passwords when resetting user accounts
2. Communicate new passwords securely (in person, encrypted message)
3. Instruct users to change the password after first login
4. Document password resets for security audit trail

### For Users:

1. Use strong, unique passwords
2. Don't share your password with anyone
3. Change your password regularly
4. Contact admin immediately if you suspect compromise
5. Never reuse passwords from other services

## UI Components

### Admin Reset Password Modal:

- Orange/red gradient design (indicates security action)
- Text input for new password (visible for easy copying)
- Warning message about user needing new password
- Reset Password and Cancel buttons

### User Change Password Page:

- Full page with user info card
- Three password inputs: current, new, confirm
- Password requirements info box
- Success/error messages
- Security warning info box

## Navigation

### Admin Access:

- Dashboard → Users → Reset PW button (per user)

### User Access:

- Dashboard → Settings → Change Password
- Or direct: `/settings/password`

## Future Enhancements

Potential improvements:

- Password strength indicator
- Password history (prevent reuse of recent passwords)
- Two-factor authentication
- Email notifications on password change
- Password reset via email (for forgotten passwords)
- Enforce password complexity rules
- Password expiration policy
