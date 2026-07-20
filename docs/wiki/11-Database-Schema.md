# Database Schema

Complete database design and data model documentation.

## Schema Overview

HouseLedger uses **SQLite** for Desktop and **SQLite (via Capacitor)** for Android.

```
┌──────────────────────────────────────────────────┐
│           HouseLedger Database Schema            │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ daily_entries                              │  │
│  │ ─────────────────────────────────────────  │  │
│  │ id INTEGER PRIMARY KEY                    │  │
│  │ sync_id TEXT (unique across devices)      │  │
│  │ type TEXT (fee, income)                   │  │
│  │ title TEXT                                │  │
│  │ amount REAL                               │  │
│  │ entry_date TEXT (YYYY-MM-DD)              │  │
│  │ category_id TEXT (FK: categories)         │  │
│  │ note TEXT                                 │  │
│  │ created_at TEXT (ISO 8601)                │  │
│  │ updated_at TEXT (ISO 8601)                │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ input_logs                                 │  │
│  │ ─────────────────────────────────────────  │  │
│  │ id INTEGER PRIMARY KEY                    │  │
│  │ source TEXT (daily, monthly)              │  │
│  │ action TEXT (add, update, delete)         │  │
│  │ type TEXT                                 │  │
│  │ title TEXT                                │  │
│  │ amount REAL                               │  │
│  │ target_date TEXT                          │  │
│  │ category_id TEXT                          │  │
│  │ note TEXT                                 │  │
│  │ payload_json TEXT (full payload)          │  │
│  │ logged_at TEXT                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ category_targets                           │  │
│  │ ─────────────────────────────────────────  │  │
│  │ month TEXT (YYYY-MM, PK)                  │  │
│  │ category_id TEXT (PK)                     │  │
│  │ amount REAL (budget target)               │  │
│  │ updated_at TEXT                           │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  JSON-backed stores:                             │
│  ├── recurring-items.json (recurring entries)    │
│  └── categories.json (category definitions)      │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## Table: daily_entries

Primary table for all transactions.

### Column Definitions

| Column | Type | Constraint | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier |
| `sync_id` | TEXT | UNIQUE | Sync across devices |
| `type` | TEXT | NOT NULL, CHECK('fee' or 'income') | Transaction type |
| `title` | TEXT | NOT NULL | User-defined label |
| `amount` | REAL | NOT NULL, >= 0 | Amount in base currency |
| `entry_date` | TEXT | NOT NULL | Date in YYYY-MM-DD format |
| `category_id` | TEXT | Foreign key to categories | Category assignment |
| `note` | TEXT | Optional | Additional notes |
| `created_at` | TEXT | NOT NULL | ISO 8601 timestamp |
| `updated_at` | TEXT | NOT NULL | ISO 8601 timestamp |

### Example Rows

```sql
-- Daily lunch expense
INSERT INTO daily_entries 
VALUES (1, 'sync-abc-123', 'fee', 'Lunch', 1500, '2023-01-15', 
        'food', 'Ramen shop', '2023-01-15T12:30:00Z', '2023-01-15T12:30:00Z');

-- Monthly salary
INSERT INTO daily_entries 
VALUES (2, 'sync-def-456', 'income', 'Salary', 300000, '2023-01-30', 
        NULL, NULL, '2023-01-30T09:00:00Z', '2023-01-30T09:00:00Z');
```

### Indexes

```sql
CREATE INDEX idx_date ON daily_entries(entry_date);
CREATE INDEX idx_category ON daily_entries(category_id);
CREATE INDEX idx_sync_id ON daily_entries(sync_id);
```

Helps fast queries by date range and category.

---

## Table: input_logs

Audit trail of all changes.

### Column Definitions

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INTEGER | Unique log ID |
| `source` | TEXT | 'daily' or 'monthly' (where change came from) |
| `action` | TEXT | 'add', 'update', 'delete', or 'conflict' |
| `type` | TEXT | 'fee', 'income', or 'conflict' |
| `title` | TEXT | Entry title |
| `amount` | REAL | Transaction amount |
| `target_date` | TEXT | Date (YYYY-MM-DD) |
| `category_id` | TEXT | Category ID |
| `note` | TEXT | Notes or conflict info |
| `payload_json` | TEXT | Full JSON payload of operation |
| `logged_at` | TEXT | Timestamp (ISO 8601) |

### Example Rows

```sql
-- Add entry log
INSERT INTO input_logs 
VALUES (1, 'daily', 'add', 'fee', 'Lunch', 1500, '2023-01-15', 
        'food', 'Ramen shop', '{"title":"Lunch","amount":1500}', 
        '2023-01-15T12:30:00Z');

-- Update entry log
INSERT INTO input_logs 
VALUES (2, 'daily', 'update', 'fee', 'Lunch (updated)', 1600, 
        '2023-01-15', 'food', 'Corrected amount', 
        '{"title":"Lunch (updated)","amount":1600}', 
        '2023-01-15T13:00:00Z');

-- Delete entry log
INSERT INTO input_logs 
VALUES (3, 'daily', 'delete', 'fee', 'Lunch', 1500, 
        '2023-01-15', 'food', NULL, 
        '{"id":1,"title":"Lunch"}', 
        '2023-01-15T14:00:00Z');

-- Conflict log (sync)
INSERT INTO input_logs 
VALUES (4, 'sync', 'conflict', 'fee', 'Lunch', 1500, 
        '2023-01-15', 'food', 
        'Remote: 1600 (newer), Local: 1500, kept local', 
        '{"remoteAmount":1600,"localAmount":1500}', 
        '2023-01-15T15:00:00Z');
```

### Queries

View all changes to an entry:
```sql
SELECT * FROM input_logs
WHERE target_date = '2023-01-15' AND title LIKE 'Lunch%'
ORDER BY logged_at DESC;
```

---

## Table: category_targets

Monthly budget targets per category.

### Column Definitions

| Column | Type | Constraint | Purpose |
|--------|------|-----------|---------|
| `month` | TEXT | PRIMARY KEY (part 1) | Month in YYYY-MM format |
| `category_id` | TEXT | PRIMARY KEY (part 2) | Category ID |
| `amount` | REAL | Default 0 | Budget target amount |
| `updated_at` | TEXT | NOT NULL | Last update timestamp |

### Example Rows

```sql
-- January targets
INSERT INTO category_targets VALUES ('2023-01', 'food', 50000, '2023-01-01T09:00:00Z');
INSERT INTO category_targets VALUES ('2023-01', 'transport', 15000, '2023-01-01T09:00:00Z');
INSERT INTO category_targets VALUES ('2023-01', 'housing', 80000, '2023-01-01T09:00:00Z');

-- February targets (different)
INSERT INTO category_targets VALUES ('2023-02', 'food', 55000, '2023-02-01T09:00:00Z');
INSERT INTO category_targets VALUES ('2023-02', 'transport', 20000, '2023-02-01T09:00:00Z');
```

### Composite Primary Key

The combination of (month, category_id) must be unique:
```sql
PRIMARY KEY (month, category_id)
```

Prevents duplicate targets for same category in same month.

### Query Examples

Get all targets for a month:
```sql
SELECT * FROM category_targets
WHERE month = '2023-01'
ORDER BY category_id;
```

Check if exceeded budget:
```sql
SELECT 
  ct.category_id,
  ct.amount as target,
  (SELECT SUM(amount) FROM daily_entries 
   WHERE category_id = ct.category_id 
   AND entry_date LIKE '2023-01%') as actual,
  CASE 
    WHEN actual > target THEN 'EXCEEDED'
    ELSE 'OK'
  END as status
FROM category_targets ct
WHERE ct.month = '2023-01';
```

---

## JSON-backed Stores

### recurring-items.json

```json
{
  "items": [
    {
      "id": "salary-2024",
      "startMonth": "2024-01",
      "endMonth": "2024-12",
      "type": "income",
      "frequency": "monthly",
      "categoryId": "salary",
      "amount": 300000,
      "title": "Monthly Salary",
      "note": "",
      "isSalary": true
    },
    {
      "id": "rent-2024",
      "startMonth": "2024-01",
      "endMonth": "2024-12",
      "type": "fee",
      "frequency": "monthly",
      "categoryId": "housing",
      "amount": 100000,
      "title": "Rent",
      "note": "Office apartment",
      "isSalary": false
    }
  ]
}
```

### categories.json

```json
{
  "categories": [
    {
      "id": "food",
      "nameJp": "食費",
      "nameEn": "Food",
      "icon": "🍽️",
      "sortOrder": 10,
      "isActive": 1
    },
    {
      "id": "custom-hobby",
      "nameJp": "趣味",
      "nameEn": "Hobby",
      "icon": "🎨",
      "sortOrder": 150,
      "isActive": 1
    }
  ]
}
```

---

## Data Types & Formats

### Date Formats

- **entry_date:** `YYYY-MM-DD` (e.g., `2023-01-15`)
- **month:** `YYYY-MM` (e.g., `2023-01`)
- **timestamps:** ISO 8601 with timezone (e.g., `2023-01-15T12:30:00Z`)

### Text Values

```
type:        'fee' | 'income'
source:      'daily' | 'monthly' | 'sync'
action:      'add' | 'update' | 'delete' | 'conflict'
frequency:   'monthly' | (others for future expansion)
```

### Numbers

- **amount:** REAL (floating point, e.g., 1234.56)
- **sortOrder:** INTEGER (for category ordering)
- **isActive:** INTEGER (0 = inactive, 1 = active)

---

## Migrations

### Migration v1 → v2 (Add sync_id)

```sql
ALTER TABLE daily_entries ADD COLUMN sync_id TEXT;
ALTER TABLE daily_entries ADD COLUMN updated_at TEXT;
UPDATE daily_entries SET updated_at = created_at WHERE updated_at IS NULL;
```

### Migration v2 → v3 (Add category_targets)

```sql
CREATE TABLE category_targets (
  month TEXT NOT NULL,
  category_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (month, category_id)
);
```

Migrations run automatically on app startup via `runStoreMigrations()`.

---

## Query Examples

### Monthly Summary

Total income and expenses for a month:
```sql
SELECT 
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'fee' THEN amount ELSE 0 END) as total_expenses
FROM daily_entries
WHERE entry_date BETWEEN '2023-01-01' AND '2023-01-31';
```

### Category Breakdown

Spending by category in a month:
```sql
SELECT 
  category_id,
  SUM(amount) as total,
  COUNT(*) as count
FROM daily_entries
WHERE type = 'fee' 
  AND entry_date BETWEEN '2023-01-01' AND '2023-01-31'
GROUP BY category_id
ORDER BY total DESC;
```

### Monthly Trends

Category spending over 12 months:
```sql
SELECT 
  strftime('%Y-%m', entry_date) as month,
  category_id,
  SUM(amount) as total
FROM daily_entries
WHERE type = 'fee'
  AND entry_date BETWEEN '2023-01-01' AND '2023-12-31'
GROUP BY month, category_id
ORDER BY month, category_id;
```

### Recent Changes (History)

Last 20 changes across all entries:
```sql
SELECT *
FROM input_logs
WHERE source IN ('daily', 'monthly')
ORDER BY logged_at DESC
LIMIT 20;
```

### Sync Conflicts

All recorded conflicts:
```sql
SELECT *
FROM input_logs
WHERE action = 'conflict'
ORDER BY logged_at DESC;
```

---

## Performance Considerations

### Indexing

Indexes created for common queries:
```sql
CREATE INDEX idx_entry_date ON daily_entries(entry_date);
CREATE INDEX idx_category ON daily_entries(category_id);
```

Add more indexes if performance needed:
```sql
CREATE INDEX idx_type ON daily_entries(type);
CREATE INDEX idx_created ON daily_entries(created_at);
```

### Query Optimization

- Use `BETWEEN` for date ranges (indexed)
- Filter by category early
- Limit results when possible
- Use `UNION` instead of `OR` when appropriate

### Archive Strategy

For large datasets (10+ years):
- Archive old years to separate database
- Keep current 2-3 years in main database
- Query union of both for reports

---

## Backup & Restore

### Backup

```bash
# Copy database file
cp ~/.config/HouseLedger/ledger.sqlite ~/.config/HouseLedger/backup.sqlite
```

### Restore

```bash
# Replace database
cp ~/.config/HouseLedger/backup.sqlite ~/.config/HouseLedger/ledger.sqlite

# Restart app
```

### Export to CSV

Database can be exported to CSV for external analysis:
```bash
# Via app: Settings → Export to CSV
```

---

## Debugging

### View Database

Using SQLite CLI:
```bash
sqlite3 ~/.config/HouseLedger/ledger.sqlite

# List tables
.tables

# Schema for a table
.schema daily_entries

# Query
SELECT * FROM daily_entries LIMIT 5;
```

### Enable WAL Mode

Already enabled in code:
```javascript
db.pragma("journal_mode = WAL");
```

This improves concurrency and crash recovery.

---

## Next Steps

- [Architecture](06-Architecture.md) — System design
- [API Reference](12-API-Reference.md) — Database API endpoints
- [Development Guide](05-Development-Guide.md) — Database operations
