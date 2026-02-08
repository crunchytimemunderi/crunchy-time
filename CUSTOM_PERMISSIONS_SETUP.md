# 🎯 Custom Permission Editor - Setup Guide

## ✅ What's New

You can now **edit individual permissions** for each user!

### Features Added:

1. **✏️ Edit Permissions Button** - Customize permissions per user
2. **Permission Checkboxes** - Enable/disable specific permissions
3. **Visual Indicators** - See which permissions are custom vs default
4. **Reset to Defaults** - Remove custom settings anytime

## 🗄️ Database Setup (REQUIRED)

### Step 1: Run FIX_USERS_RLS_EMERGENCY.sql (if not already done)

This fixes the infinite recursion error.

**Location:** `FIX_USERS_RLS_EMERGENCY.sql`

Execute in Supabase SQL Editor.

### Step 2: Add Custom Permissions Column

This adds the ability to store custom permissions.

**Location:** `ADD_CUSTOM_PERMISSIONS.sql`

Execute in Supabase SQL Editor:

```sql
-- Add custom permissions column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS custom_permissions jsonb DEFAULT NULL;
```

## 🎨 How to Use

### Edit User Permissions:

1. Go to **User Management** page
2. Find user in table
3. Click **✏️ Edit** button (in Permissions column)
4. Modal opens with all permissions as checkboxes
5. Check/uncheck permissions as needed
6. Click **💾 Save Permissions**

### Permission States:

- **✅ Green** = Permission granted
- **❌ Red** = Permission denied
- **Purple "Modified" Badge** = Custom setting active
- **Default indicator** = Shows what the role default would be

### Reset to Defaults:

1. Open Edit Permissions modal
2. Click **🔄 Reset to Defaults**
3. Confirms and removes all custom settings
4. User reverts to role-based permissions (admin/staff)

## 📋 Available Permissions

| Permission               | Admin Default | Staff Default |
| ------------------------ | ------------- | ------------- |
| View Dashboard           | ✅            | ✅            |
| Add Sales                | ✅            | ✅            |
| Add Expenses             | ✅            | ✅            |
| View All Sales           | ✅            | ❌            |
| View All Expenses        | ✅            | ❌            |
| Edit Records             | ✅            | ❌            |
| Delete Records           | ✅            | ❌            |
| Cash Reconciliation      | ✅            | ❌            |
| Edit Past Reconciliation | ✅            | ❌            |
| View Inventory           | ✅            | ❌            |
| Manage Inventory         | ✅            | ❌            |
| User Management          | ✅            | ❌            |

## 🎯 Use Cases

### Example 1: Senior Staff

- **Role:** Staff
- **Custom Permissions:**
  - ✅ View All Sales (granted)
  - ✅ Cash Reconciliation (granted)
  - ❌ Edit Records (denied)
  - ❌ User Management (denied)

### Example 2: Limited Admin

- **Role:** Admin
- **Custom Permissions:**
  - ✅ Most admin features (granted)
  - ❌ User Management (denied - can't create/delete users)

### Example 3: View-Only User

- **Role:** Staff
- **Custom Permissions:**
  - ✅ View Dashboard (granted)
  - ✅ View All Sales (granted)
  - ✅ View All Expenses (granted)
  - ❌ Add Sales (denied)
  - ❌ Add Expenses (denied)
  - ❌ Everything else (denied)

## 🔍 Visual Indicators

### In User Table:

- **"View"** button = See role-based permission list
- **"✏️ Edit"** button = Customize permissions
- **"✏️ Edit (Custom)"** = User has custom permissions active

### In Edit Modal:

- **Green background** = Permission enabled
- **Red background** = Permission disabled
- **Purple "Modified" badge** = Different from role default
- **(Default: ✅/❌)** = Shows what role default is

## ⚙️ How It Works

### Data Storage:

```json
{
  "custom_permissions": {
    "canViewDashboard": true,
    "canAddSales": true,
    "canViewAllSales": false,
    ...
  }
}
```

### Permission Logic:

1. If `custom_permissions` exists → use custom settings
2. If `custom_permissions` is NULL → use role defaults
3. Admin role defaults = all permissions ✅
4. Staff role defaults = limited permissions ❌

### Database Column:

- **Type:** `jsonb` (flexible JSON storage)
- **Default:** `NULL` (use role defaults)
- **Custom:** JSON object with permission keys

## 🚨 Important Notes

1. **Custom permissions override role defaults**
   - Even if user is "Admin", you can deny specific permissions
   - Even if user is "Staff", you can grant specific permissions

2. **Reset removes all custom settings**
   - User reverts to role-based permissions
   - Cannot be undone (unless you save again)

3. **Role still matters**
   - Role determines UI navigation visibility
   - Custom permissions fine-tune access within features

4. **Self-protection remains**
   - You cannot edit your own permissions
   - Prevents accidental lockout

## 📱 UI Features

### Permission Editor Modal:

- Scrollable (handles 12+ permissions)
- Color-coded checkboxes
- Real-time visual feedback
- Clear save/reset/cancel buttons

### Responsive Design:

- Works on desktop, tablet, mobile
- Modal scrolls on smaller screens
- Checkboxes are touch-friendly

### Dark Mode Support:

- Full dark theme compatibility
- Proper contrast in both modes

## ✅ Testing Checklist

### Before SQL:

- [ ] Open user management
- [ ] See "View" button only (no Edit)
- [ ] OR see error if clicking Edit

### After Running ADD_CUSTOM_PERMISSIONS.sql:

- [ ] Refresh page
- [ ] See both "View" and "✏️ Edit" buttons
- [ ] Click Edit on a user
- [ ] See permission checkboxes
- [ ] Check/uncheck some permissions
- [ ] Click Save - success message appears
- [ ] "✏️ Edit (Custom)" shows next to button
- [ ] Click Reset to Defaults
- [ ] Confirm - reverts to role defaults
- [ ] "(Custom)" indicator disappears

## 💡 Tips

1. **Start with role assignment**
   - Set user role (admin/staff) first
   - Then customize if needed

2. **Document custom permissions**
   - Keep notes on who has what custom access
   - Useful for security audits

3. **Review regularly**
   - Check custom permissions periodically
   - Remove if user's role changes

4. **Use sparingly**
   - Most users should use role defaults
   - Only customize when truly needed

## 🔗 Related Files

- `app/users/page.tsx` - User management interface with editor
- `FIX_USERS_RLS_EMERGENCY.sql` - RLS policy fixes
- `ADD_CUSTOM_PERMISSIONS.sql` - Custom permissions column
- `PERMISSIONS_GUIDE.md` - Complete permission documentation

## 🎉 Summary

You now have **granular permission control**:

- ✅ 12 customizable permissions per user
- ✅ Visual checkbox editor
- ✅ Override role defaults
- ✅ Easy reset to defaults
- ✅ Color-coded UI
- ✅ Custom indicators

Perfect for creating specialized roles like "Senior Staff", "View-Only Admin", or "Limited Staff"!

---

**Status:** Ready to use after running ADD_CUSTOM_PERMISSIONS.sql ✅  
**Last Updated:** February 4, 2026  
**Feature:** Custom Permission Editor v1.0
