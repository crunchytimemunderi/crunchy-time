# Inventory Setup Instructions

## 🎯 What's New

I've added **Inventory Management** with Indian Rupee (₹) currency formatting throughout your app!

### ✨ New Features

1. **Inventory Management Page** (`/inventory`)
   - Add, edit, delete inventory items
   - Track stock quantity, unit prices, categories
   - Admin-only access
   - Full CRUD operations

2. **Sales Page Updates**
   - Select items from inventory with auto-price calculation
   - Or manually enter amount (toggle option)
   - Description auto-fills when using inventory items
   - All amounts displayed in ₹ (Indian Rupees)

3. **Expenses Page Updates**
   - Select items from inventory
   - Category auto-fills based on item
   - Manual entry option also available
   - All amounts displayed in ₹ (Indian Rupees)

4. **Dashboard Updates**
   - New "Manage Inventory" quick action button
   - All currency displays updated to ₹ format
   - Grid layout adjusted for 4 quick actions

5. **Currency Formatting**
   - Created `lib/currency.ts` utility
   - All amounts now display as: ₹1,234.50
   - Used throughout sales, expenses, dashboard

---

## 📋 Database Setup Required

### Step 1: Create Inventory Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create inventory table
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

### Step 2: Add Sample Inventory Items (Optional)

```sql
-- Add some sample inventory items
INSERT INTO inventory (item_name, category, unit_price, stock_quantity, unit) VALUES
('Chicken Breast', 'chicken', 250.00, 50.00, 'kg'),
('Chicken Legs', 'chicken', 180.00, 30.00, 'kg'),
('Cooking Oil', 'oil', 150.00, 20.00, 'litre'),
('Garam Masala', 'masala', 80.00, 5.00, 'packet'),
('Red Chili Powder', 'masala', 60.00, 3.00, 'packet'),
('LPG Cylinder', 'gas', 900.00, 2.00, 'piece'),
('Food Container', 'packaging', 15.00, 100.00, 'piece');
```

---

## 🚀 How to Use

### For Admins:

1. **Manage Inventory**
   - Go to Dashboard → Click "Manage Inventory" or navigate to `/inventory`
   - Add items with: name, category, price per unit, stock quantity, unit type
   - Edit or delete existing items

2. **Record Sales with Inventory**
   - Go to Sales page
   - Check "Select from Inventory"
   - Choose item from dropdown (shows price per unit)
   - Enter quantity → Amount auto-calculates!
   - Or uncheck to manually enter amount

3. **Record Expenses with Inventory**
   - Go to Expenses page
   - Check "Select from Inventory"
   - Choose item → Category auto-fills
   - Enter quantity → Amount auto-calculates!
   - Or uncheck to manually enter amount

### For Staff:

- Can view inventory items when recording sales
- Cannot manage (add/edit/delete) inventory
- Sales page shows inventory selection for easy recording

---

## 🔒 Security

- Inventory route (`/inventory`) protected - Admin only
- RLS policies ensure:
  - All authenticated users can READ inventory
  - Only admins can CREATE/UPDATE/DELETE inventory
- Middleware blocks non-admin access to inventory management

---

## 📝 Files Created/Modified

### New Files:
- `lib/currency.ts` - Indian Rupee formatting utilities
- `app/inventory/page.tsx` - Inventory management page
- `INVENTORY_SETUP.md` - This file

### Modified Files:
- `SUPABASE_SETUP.md` - Added inventory table schema
- `app/sales/page.tsx` - Added inventory selection
- `app/expenses/page.tsx` - Added inventory selection
- `app/dashboard/page.tsx` - Added inventory button, ₹ formatting
- `middleware.ts` - Added `/inventory` to admin-only routes

### Currency Updates (₹ symbol everywhere):
- All `formatCurrency()` calls replaced with `formatINR()`
- Dashboard stats cards
- Sales summaries
- Expense summaries
- Recent activity displays

---

## 🎨 UI Features

### Inventory Page:
- Clean table view with item details
- Add/Edit form with validation
- Delete with confirmation
- Stock quantity highlights (red if < 10)
- Category badges with colors
- Responsive design

### Sales/Expenses Pages:
- Toggle checkbox: "Select from Inventory"
- Dropdown shows: Item Name (₹price/unit)
- Quantity input shows unit type
- Amount auto-calculates as you type
- Description auto-fills (can be edited)
- Still allows manual entry if preferred

---

## ✅ Next Steps

1. **Run the SQL** in your Supabase SQL Editor (Step 1 above)
2. **Restart your dev server** if it's running
3. **Login as admin** and navigate to `/inventory`
4. **Add your inventory items**
5. **Test sales/expenses** with inventory selection

---

## 💡 Tips

- Keep inventory updated for accurate pricing
- Use inventory selection for consistent pricing
- Manual entry still available for one-off items
- Stock quantity is informational only (not auto-deducted)
- Low stock (< 10) highlighted in red on inventory page

---

## 🐛 Troubleshooting

**If inventory doesn't load:**
- Check SQL ran successfully in Supabase
- Verify RLS policies created
- Check browser console for errors
- Ensure logged in as admin

**If amounts don't auto-calculate:**
- Ensure item is selected first
- Then enter quantity
- Check browser console for errors

**If can't access /inventory:**
- Must be logged in as admin
- Staff users will be redirected

---

Enjoy your new inventory management system! 🎉
