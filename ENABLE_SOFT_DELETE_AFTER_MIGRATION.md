# AFTER SQL MIGRATIONS - Re-enable Soft Delete Filters

## ⚠️ IMPORTANT: After running SQL migrations, revert this commit

Once you've successfully run these SQL migrations in Supabase:
1. `sql/CREATE_AUDIT_LOG.sql`
2. `sql/ADD_SOFT_DELETE.sql`

You need to re-enable the soft delete filters in the following files:

## Files to Update:

### 1. app/sales/page.tsx (2 locations)

**Location 1 - fetchMenuItems:**
```typescript
// Change FROM:
const { data, error } = await supabase
  .from("menu_items")
  .select("*")
  .order("name")
  
// TO:
const { data, error } = await supabase
  .from("menu_items")
  .select("*")
  .is("deleted_at", null)
  .order("name")
```

**Location 2 - fetchSales:**
```typescript
// Change FROM:
const { data, error } = await supabase
  .from("sales")
  .select("*")
  .eq("date", selectedDate)
  .order("created_at", { ascending: false })
  
// TO:
const { data, error } = await supabase
  .from("sales")
  .select("*")
  .eq("date", selectedDate)
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
```

**Location 3 - handleExportSales:**
```typescript
// Change FROM:
const { data, error } = await supabase
  .from("sales")
  .select("*")
  .gte("date", exportStartDate)
  .lte("date", exportEndDate)
  .order("created_at", { ascending: false })
  
// TO:
const { data, error } = await supabase
  .from("sales")
  .select("*")
  .gte("date", exportStartDate)
  .lte("date", exportEndDate)
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
```

### 2. app/expenses/page.tsx (2 locations)

**Location 1 - fetchExpenses:**
```typescript
// Change FROM:
const { data, error } = await supabase
  .from("expenses")
  .select("*")
  .eq("date", selectedDate)
  .order("created_at", { ascending: false })
  
// TO:
const { data, error } = await supabase
  .from("expenses")
  .select("*")
  .eq("date", selectedDate)
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
```

**Location 2 - handleExportExpenses:**
```typescript
// Change FROM:
const { data, error } = await supabase
  .from("expenses")
  .select("*")
  .gte("date", exportStartDate)
  .lte("date", exportEndDate)
  .order("created_at", { ascending: false })
  
// TO:
const { data, error } = await supabase
  .from("expenses")
  .select("*")
  .gte("date", exportStartDate)
  .lte("date", exportEndDate)
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
```

### 3. app/cash/page.tsx (4 locations)

```typescript
// Add .is("deleted_at", null) to all 4 queries:

// 1. Cash sales query
const { data: cashSalesData } = await supabase
  .from("sales")
  .select("amount")
  .eq("date", selectedDate)
  .eq("payment_method", "cash")
  .is("deleted_at", null);  // ADD THIS

// 2. UPI sales query
const { data: upiSalesData } = await supabase
  .from("sales")
  .select("amount")
  .eq("date", selectedDate)
  .eq("payment_method", "upi")
  .is("deleted_at", null);  // ADD THIS

// 3. Cash expenses query
const { data: cashExpensesData } = await supabase
  .from("expenses")
  .select("amount")
  .eq("date", selectedDate)
  .eq("payment_mode", "cash")
  .is("deleted_at", null);  // ADD THIS

// 4. UPI expenses query
const { data: upiExpensesData } = await supabase
  .from("expenses")
  .select("amount")
  .eq("date", selectedDate)
  .eq("payment_mode", "upi")
  .is("deleted_at", null);  // ADD THIS
```

### 4. lib/cash-validation.ts

```typescript
// Change FROM:
const { data: sales, error } = await supabase
  .from("sales")
  .select("payment_method, total_amount")
  .gte("created_at", startOfDay.toISOString())
  .lte("created_at", endOfDay.toISOString());
  
// TO:
const { data: sales, error } = await supabase
  .from("sales")
  .select("payment_method, total_amount")
  .gte("created_at", startOfDay.toISOString())
  .lte("created_at", endOfDay.toISOString())
  .is("deleted_at", null);
```

## Why This Matters:

- **Without migrations**: Queries fail because `deleted_at` column doesn't exist
- **After migrations**: Must filter out soft-deleted records or you'll see deleted items
- **Soft delete**: Records stay in database for audit but marked as deleted

## How to Apply:

After running SQL migrations, use Find & Replace in VS Code:

**Find:**
```
.select("*")
```

**Replace with:**
```
.select("*")
.is("deleted_at", null)
```

Then manually verify each change is in the right place.

## Verification:

After re-enabling filters, test:
1. Sales page loads menu items ✅
2. Cash reconciliation calculates correctly ✅
3. Expenses page loads ✅
4. Export functions work ✅
5. Delete an item → it disappears from lists ✅
6. Check audit_log table → deletion recorded ✅
