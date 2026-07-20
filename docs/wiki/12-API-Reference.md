# API Reference

Complete API documentation for HouseLedger backend.

## Overview

HouseLedger uses an IPC-based (Electron) and Capacitor-based (Android) API architecture.

```javascript
// Frontend code always uses:
import { api } from "./lib/api.js";

// Which routes to correct backend automatically:
// Desktop: api → IPC → Electron main process
// Android: api → Capacitor plugin → SQLite
```

---

## Entry API

Manage daily transactions (income and expenses).

### api.entry.list(payload)

List entries for a month with optional filtering.

**Parameters:**
```javascript
{
  month: "2023-01",           // YYYY-MM format (required)
  categoryId: "food",         // Optional: filter by category
  dateRange: {                // Optional: date range filter
    fromDate: "2023-01-01",   // YYYY-MM-DD format
    toDate: "2023-01-31"
  },
  locale: "en"                // Language for output
}
```

**Returns:**
```javascript
[
  {
    id: 1,
    syncId: "uuid-123",
    type: "fee",
    title: "Lunch",
    amount: 1000,
    entryDate: "2023-01-15",
    categoryId: "food",
    note: "Ramen shop",
    createdAt: "2023-01-15T12:30:00Z",
    updatedAt: "2023-01-15T12:30:00Z"
  },
  // ... more entries
]
```

**Example:**
```javascript
const entries = await api.entry.list({
  month: "2023-01",
  categoryId: "food"
});
```

---

### api.entry.add(payload)

Create a new entry.

**Parameters:**
```javascript
{
  type: "fee",                        // "fee" or "income" (required)
  title: "Lunch",                     // (required)
  amount: 1500,                       // In base currency (required)
  entryDate: "2023-01-15",           // YYYY-MM-DD format (required)
  categoryId: "food",                 // (optional)
  note: "With coworkers"             // (optional)
}
```

**Returns:**
```javascript
{
  id: 123,
  syncId: "uuid-456",
  // ... full entry object
}
```

**Errors:**
- Validation error: Invalid amount, date, or type
- Database error: Cannot write to database

---

### api.entry.update(payload)

Update an existing entry.

**Parameters:**
```javascript
{
  id: 123,                    // Entry ID (required)
  type: "fee",               // Can change type
  title: "Lunch",            // Updated title
  amount: 1600,              // Updated amount
  entryDate: "2023-01-15",   // Updated date
  categoryId: "food",        // Updated category
  note: "Updated note"
}
```

**Returns:**
```javascript
{
  id: 123,
  updatedAt: "2023-01-15T13:00:00Z",
  // ... full updated entry
}
```

---

### api.entry.delete(payload)

Delete an entry.

**Parameters:**
```javascript
{
  id: 123    // Entry ID (required)
}
```

**Returns:**
```javascript
{ ok: true }
```

---

### api.entry.importCsv(payload)

Import entries from CSV.

**Parameters:**
```javascript
{
  csvContent: "title,amount,date,category\n...",
  categoryMapping: {
    "Lunch": "food",
    "Bus": "transport"
    // Map CSV values to category IDs
  }
}
```

**Returns:**
```javascript
{
  imported: 50,
  skipped: 2,
  errors: ["Row 5: Invalid amount"]
}
```

---

### api.entry.exportCsv(payload)

Export entries to CSV format.

**Parameters:**
```javascript
{
  month: "2023-01"   // Month to export (required)
}
```

**Returns:**
```javascript
{
  csvContent: "id,type,title,amount,entryDate,categoryId,note,createdAt\n1,fee,Lunch,1000,2023-01-15,food,,2023-01-15T12:30:00Z\n..."
}
```

---

## Category API

Manage transaction categories.

### api.category.list(payload)

Get all categories.

**Parameters:**
```javascript
{
  locale: "en"   // Language for names
}
```

**Returns:**
```javascript
[
  {
    id: "food",
    nameJp: "食費",
    nameEn: "Food",
    icon: "🍽️",
    sortOrder: 10,
    isActive: 1
  },
  // ... 12 more categories
]
```

---

### api.category.add(payload)

Create a custom category.

**Parameters:**
```javascript
{
  id: "custom-hobby",   // Unique ID
  nameJp: "趣味",
  nameEn: "Hobby",
  icon: "🎨",
  sortOrder: 150
}
```

**Returns:**
```javascript
{
  id: "custom-hobby",
  // ... full category
}
```

---

### api.category.update(payload)

Update category.

**Parameters:**
```javascript
{
  id: "food",
  nameEn: "Groceries & Dining",
  icon: "🥘"
}
```

---

### api.category.delete(payload)

Delete category (reassigns entries to "other").

**Parameters:**
```javascript
{
  id: "custom-hobby"
}
```

---

### api.category.reorder(payload)

Reorder categories for display.

**Parameters:**
```javascript
{
  order: ["food", "transport", "housing", ...]  // Array of category IDs
}
```

---

### api.category.reset()

Reset to default categories.

**Returns:**
```javascript
{
  reset: true,
  count: 13
}
```

---

## Recurring API

Manage recurring monthly items.

### api.recurring.list()

Get all recurring items.

**Returns:**
```javascript
[
  {
    id: "salary-2024",
    startMonth: "2024-01",
    endMonth: "2024-12",
    type: "income",
    frequency: "monthly",
    categoryId: "salary",
    amount: 300000,
    title: "Monthly Salary",
    note: "",
    isSalary: true
  },
  // ... more recurring items
]
```

---

### api.recurring.add(payload)

Create recurring item.

**Parameters:**
```javascript
{
  type: "income",           // "fee" or "income"
  frequency: "monthly",
  categoryId: "salary",
  amount: 300000,
  title: "Salary",
  startMonth: "2024-01",
  endMonth: "2024-12",
  isSalary: true
}
```

---

### api.recurring.update(payload)

Update recurring item.

**Parameters:**
```javascript
{
  id: "salary-2024",
  amount: 320000,           // Update salary
  // ... other fields to change
}
```

---

### api.recurring.delete(payload)

Delete recurring item.

**Parameters:**
```javascript
{
  id: "salary-2024"
}
```

---

## Summary API

Get financial summaries and breakdowns.

### api.summary.month(payload)

Get monthly summary.

**Parameters:**
```javascript
{
  month: "2023-01",      // YYYY-MM format
  categoryId: "food"     // Optional: specific category
}
```

**Returns:**
```javascript
{
  month: "2023-01",
  fee: 120000,           // Total expenses
  income: 300000,        // Total income
  balance: 180000,       // income - fee
  recurringFee: 100000,
  recurringIncome: 300000,
  dailyFee: 20000,
  dailyIncome: 0
}
```

---

### api.summary.range(payload)

Get summary for date range.

**Parameters:**
```javascript
{
  fromMonth: "2023-01",
  toMonth: "2023-12"
}
```

**Returns:**
```javascript
{
  fromMonth: "2023-01",
  toMonth: "2023-12",
  totalIncome: 3600000,
  totalFee: 2400000,
  totalBalance: 1200000,
  monthlyAverageIncome: 300000,
  monthlyAverageFee: 200000
}
```

---

### api.summary.categoryBreakdown(payload)

Get category spending breakdown.

**Parameters:**
```javascript
{
  month: "2023-01",
  locale: "en"
}
```

**Returns:**
```javascript
[
  {
    categoryId: "food",
    categoryIcon: "🍽️",
    categoryDisplay: "Food",
    total: 50000,
    percentage: 25.5
  },
  {
    categoryId: "transport",
    categoryIcon: "🚌",
    categoryDisplay: "Transport",
    total: 15000,
    percentage: 7.6
  },
  // ... all categories
]
```

---

### api.summary.categoryTrend(payload)

Get category spending trends over months.

**Parameters:**
```javascript
{
  fromMonth: "2023-01",
  toMonth: "2023-12",
  locale: "en"
}
```

**Returns:**
```javascript
[
  {
    month: "2023-01",
    categories: {
      "food": 50000,
      "transport": 15000,
      "housing": 80000
    }
  },
  {
    month: "2023-02",
    categories: {
      "food": 52000,
      "transport": 14000,
      "housing": 80000
    }
  },
  // ... 12 months
]
```

---

## History API

Access change logs and audit trail.

### api.history.list(payload)

Get change history for a month.

**Parameters:**
```javascript
{
  month: "2023-01",      // YYYY-MM
  locale: "en"
}
```

**Returns:**
```javascript
[
  {
    id: 1,
    source: "daily",
    action: "add",
    type: "fee",
    title: "Lunch",
    amount: 1000,
    targetDate: "2023-01-15",
    categoryId: "food",
    note: "Ramen shop",
    loggedAt: "2023-01-15T12:30:00Z"
  },
  {
    id: 2,
    source: "daily",
    action: "update",
    type: "fee",
    title: "Lunch",
    amount: 1200,
    targetDate: "2023-01-15",
    categoryId: "food",
    note: "Corrected",
    loggedAt: "2023-01-15T13:00:00Z"
  },
  // ... more logs
]
```

---

## Targets API

Manage monthly budget targets.

### api.targets.get(month)

Get targets for a month.

**Parameters:**
```javascript
"2023-01"  // YYYY-MM format
```

**Returns:**
```javascript
{
  "2023-01": {
    "food": 50000,
    "transport": 15000,
    "housing": 80000
  }
}
```

---

### api.targets.save(payload)

Save/update budget targets.

**Parameters:**
```javascript
{
  month: "2023-01",
  targets: {
    "food": 50000,
    "transport": 15000,
    "housing": 80000
  }
}
```

**Returns:**
```javascript
{ ok: true, saved: 3 }  // Number of targets saved
```

---

## Sync API

Synchronize data between devices.

### api.sync.serverInfo()

Get sync server info (Desktop only).

**Returns:**
```javascript
{
  appName: "HouseLedger",
  appVersion: "0.1.0",
  serverVersion: "1.0",
  timestamp: "2023-01-15T12:30:00Z"
}
```

---

### api.sync.exportData()

Export all data for sync.

**Returns:**
```javascript
{
  timestamp: "2023-01-15T12:30:00Z",
  entries: [...],           // All daily_entries
  recurringItems: [...],    // All recurring items
  categories: [...],        // All categories
  categoryTargets: {...}    // All targets
}
```

---

### api.sync.importData(payload)

Import synced data.

**Parameters:**
```javascript
{
  timestamp: "2023-01-15T12:30:00Z",
  entries: [...],
  recurringItems: [...],
  categories: [...],
  categoryTargets: {...}
}
```

**Returns:**
```javascript
{
  ok: true,
  merged: {
    entriesAdded: 5,
    entriesUpdated: 3,
    entriesDeleted: 0,
    conflicts: 0
  }
}
```

---

### api.sync.syncNow()

Perform full sync (Desktop only).

**Returns:**
```javascript
{ ok: true, mode: "desktop-server" }
```

---

## Error Handling

### Error Format

All errors return standard format:

```javascript
throw new Error("Validation error: invalid amount");
```

### Common Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid month format" | YYYY-MM not provided | Check month parameter |
| "Invalid amount" | amount < 0 or not a number | Validate input |
| "Invalid date" | YYYY-MM-DD format wrong | Check date format |
| "Category not found" | Category ID doesn't exist | Create or use existing category |
| "Database error" | SQLite operation failed | Check disk space, permissions |
| "Sync connection refused" | Desktop not reachable | Check IP, port, network |

---

## Response Codes

### Success
- `200 OK` — Operation successful
- `201 Created` — Resource created

### Errors
- `400 Bad Request` — Invalid parameters
- `404 Not Found` — Resource doesn't exist
- `500 Internal Server Error` — Database/system error

---

## Rate Limiting

No rate limiting currently (local-only application).

---

## Versioning

Current API version: **1.0**

Breaking changes will increment major version and documented.

---

## Next Steps

- [Database Schema](11-Database-Schema.md) — Data model details
- [Architecture](06-Architecture.md) — Backend design
- [Development Guide](05-Development-Guide.md) — Using the API
