# Architecture

Technical deep dive into HouseLedger's system design.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      HouseLedger Application                     │
├──────────────────────┬─────────────────┬────────────────────────┤
│                      │                 │                        │
│   Electron Desktop   │  Android/Web    │    Shared Web Code     │
│   (Windows/Mac)      │   (Capacitor)   │    (React + Vite)      │
│                      │                 │                        │
└────────┬─────────────┴────────┬────────┴────────────────┬───────┘
         │                      │                         │
         │                      │         ┌───────────────┘
         │                      │         │
      IPC Bridge        Capacitor Plugin  │ HTTP
    window.ledgerApi    CapacitorSQLite   │ REST
         │                      │         │
         └──────────┬───────────┴─────────┘
                    │
                    v
          ┌─────────────────────┐
          │   API Layer         │
          │  (Ledger Store)     │
          └──────────┬──────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        v            v            v
    ┌────────┐ ┌──────────┐ ┌────────────┐
    │ SQLite │ │  JSON    │ │  LAN Sync  │
    │Database│ │  Files   │ │  Server    │
    └────────┘ └──────────┘ └────────────┘
         │                         │
         │                         │ HTTP:30303
         v                         v
    File System          Network (Wi-Fi/LAN)
```

---

## Frontend Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI Framework | React 19 | Component-based UI |
| Build Tool | Vite 5 | Fast bundling & dev server |
| Styling | CSS3 | Dark theme with CSS variables |
| i18n | translations.js | Multi-language support |
| State Mgmt | React Hooks | useState, useEffect, useReducer, useMemo |
| Testing | Jest + RTL | Unit & integration tests |

### Component Hierarchy

```
App.jsx (Main component)
├── Navigation
├── Page Router (activePage state)
│   ├── DailyEntryPage
│   │   ├── DailySection (Form)
│   │   ├── DailyListSection (List)
│   │   └── CategoryManagerSection
│   ├── MonthlyEntryPage
│   │   ├── MonthlySection (Form)
│   │   └── RecurringSection
│   ├── HistoryPage
│   ├── CategoryAnalysisPage
│   │   ├── CategoryBreakdown Table
│   │   ├── Bar Chart (Trends)
│   │   └── TargetAmountSetting Modal
│   ├── StatisticsSummaryPage
│   │   ├── Annual Summary Table
│   │   └── SavingsSimulationPanel
│   └── SettingsPage
│       ├── Currency Selector
│       ├── Language Selector
│       └── LAN Sync Config
└── ErrorBoundary (Error fallback)
```

### Data Flow

```
User Interaction
      │
      v
  Component Event Handler
      │
      v
  Validate Input
      │
      v
  Call API (via api.js)
      │
      v
  Backend Processing
      │
      v
  Database Operation
      │
      v
  Return Result
      │
      v
  Update Component State
      │
      v
  Re-render View
```

### State Management Pattern

Each page manages its own state:

```javascript
// Example: CategoryAnalysisPage
const [breakdownRows, setBreakdownRows] = useState([]);
const [trendRows, setTrendRows] = useState([]);
const [targets, setTargets] = useState({});
const [view, setView] = useState("main"); // Modal view

useEffect(() => {
  loadMonthData(selectedMonth);
}, [selectedMonth]);
```

---

## Backend Architecture

### Platform Abstraction

HouseLedger uses a **platform-agnostic API layer**:

```javascript
// Frontend code
import { api } from "./lib/api.js";

// Desktop (Electron)
api.entry.list() → window.ledgerApi.entry.list()
                   ↓
                   IPC → main process
                   ↓
                   ledger.listEntries()
                   ↓
                   SQLite query

// Android (Capacitor)
api.entry.list() → Capacitor plugin
                   ↓
                   SQLite (Java/Kotlin layer)
```

### Electron Main Process

```
main.js (Electron app)
├── Window Management
├── IPC Handlers
├── Ledger Store (createLedgerStore)
├── Sync Server (startSyncServer)
└── Error Handling
```

Lifecycle:
1. App starts → `app.whenReady()`
2. Load/migrate database
3. Create Ledger store
4. Start sync server
5. Create browser window
6. Expose API via preload.js

### Ledger Store

Core business logic layer:

```javascript
const ledger = createLedgerStore(dataDir);

ledger.entry.add(payload)           // Add entry
ledger.entry.list(payload)          // List entries
ledger.entry.update(payload)        // Update entry
ledger.entry.delete({ id })         // Delete entry

ledger.category.list()              // List categories
ledger.category.add(payload)        // Add category
ledger.targets.save(payload)        // Save budget targets

ledger.summary.month(month)         // Month summary
ledger.summary.categoryBreakdown()   // Category breakdown
```

---

## Database Design

### Schema Overview

**Tables:**

```sql
CREATE TABLE daily_entries (
  id INTEGER PRIMARY KEY,
  sync_id TEXT,              -- Unique across devices
  type TEXT CHECK(type IN ('fee','income')),
  title TEXT,
  amount REAL CHECK(amount >= 0),
  entry_date TEXT,           -- YYYY-MM-DD format
  category_id TEXT,
  note TEXT,
  created_at TEXT,
  updated_at TEXT            -- For sync conflict resolution
);

CREATE TABLE input_logs (
  id INTEGER PRIMARY KEY,
  source TEXT CHECK(source IN ('monthly','daily')),
  action TEXT CHECK(action IN ('add','update','delete')),
  type TEXT,
  title TEXT,
  amount REAL,
  target_date TEXT,
  category_id TEXT,
  note TEXT,
  payload_json TEXT,         -- Full payload for audit
  logged_at TEXT
);

CREATE TABLE category_targets (
  month TEXT,
  category_id TEXT,
  amount REAL,
  updated_at TEXT,
  PRIMARY KEY (month, category_id)
);
```

**JSON-backed stores:**

```javascript
// recurring-items.json
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
      "note": ""
    }
  ]
}

// categories.json
{
  "categories": [
    {
      "id": "food",
      "nameJp": "食費",
      "nameEn": "Food",
      "icon": "🍽️",
      "sortOrder": 10,
      "isActive": 1
    }
  ]
}
```

---

## API Contract

### Request-Response Pattern

**Desktop (IPC):**
```javascript
// Preload.js exposes:
window.ledgerApi.entry.list(payload)
  → Returns: Promise<Array>
  → Throws: Error on validation/DB error
```

**Android (Capacitor):**
```javascript
// Capacitor plugin returns:
{ ok: true, data: [...] }
// or
{ ok: false, error: "message" }
```

### Payload Structures

**List Entries:**
```javascript
{
  month: "2023-01",
  categoryId: "food",     // Optional
  dateRange: {
    fromDate: "2023-01-01",  // Optional
    toDate: "2023-01-31"
  },
  locale: "en"
}
```

**Add Entry:**
```javascript
{
  type: "fee",            // "fee" or "income"
  title: "Lunch",
  amount: 1000,
  entryDate: "2023-01-15",  // ISO format
  categoryId: "food",
  note: "Optional note",
  createdAt: "2023-01-15T12:30:00Z",
  updatedAt: "2023-01-15T12:30:00Z"
}
```

---

## LAN Sync Architecture

### Server Side (Desktop)

```javascript
// sync-server.js
const server = http.createServer((req, res) => {
  if (req.url === '/api/sync/export') {
    // Export all data
    const data = ledger.sync.exportData();
    res.json(data);
  }
  
  if (req.url === '/api/sync/import' && req.method === 'POST') {
    // Import and merge
    const incoming = JSON.parse(body);
    ledger.sync.importData(incoming);
    res.json({ ok: true });
  }
});

server.listen(30303, '0.0.0.0');  // Listen on all interfaces
```

### Client Side (Android)

```javascript
// Settings screen
const desktopUrl = "http://192.168.1.100:30303";

// Sync button
async function syncNow() {
  const remoteData = await fetch(`${desktopUrl}/api/sync/export`).json();
  const localData = ledger.export();
  const merged = mergeSyncData(localData, remoteData);
  await ledger.importData(merged);
}
```

### Data Merge Strategy

```javascript
function mergeSyncData(local, remote) {
  const merged = { ...local.entries };
  
  // Latest timestamp wins
  for (const id in remote.entries) {
    const remoteEntry = remote.entries[id];
    const localEntry = merged[id];
    
    if (!localEntry || remoteEntry.updatedAt > localEntry.updatedAt) {
      merged[id] = remoteEntry;
    }
  }
  
  return { entries: merged };
}
```

---

## Localization Flow

```
Translation Keys → TRANSLATIONS object → getMessages(locale) → t object
```

In component:
```javascript
// Get translation object
const t = useMemo(() => getMessages(locale), [locale]);

// Use in JSX
<h1>{t.myKey}</h1>

// Falls back to English if key not in locale
```

---

## Error Handling Strategy

### Frontend

```javascript
try {
  const result = await api.entry.add(payload);
  showToast(t.successMessage);
} catch (err) {
  logError("add-entry", err);
  setError(t.errorSaveFailed);
  // UI shows error message
}
```

### Backend

```javascript
// Validation errors
if (!validateMonth(month)) {
  throw new Error("Invalid month format");
}

// Database errors
try {
  const result = db.prepare(sql).run(params);
} catch (dbErr) {
  logError("db-operation", dbErr);
  throw new Error("Database operation failed");
}
```

### Error Boundary

```javascript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log error
    logError("ErrorBoundary", error);
    
    // Show fallback UI
    this.setState({ hasError: true, error });
  }
}
```

---

## Performance Considerations

### Memoization

```javascript
// Expensive calculation
const total = useMemo(() => {
  return entries.reduce((sum, e) => sum + e.amount, 0);
}, [entries]);

// Prevent unnecessary re-renders
const MemoizedList = React.memo(ItemList);
```

### Query Optimization

```javascript
// SQLite prepared statements
const stmt = db.prepare(`
  SELECT * FROM daily_entries
  WHERE entry_date BETWEEN @from AND @to
  ORDER BY entry_date DESC
  LIMIT 1000
`);

// Index on frequently queried columns
db.exec("CREATE INDEX IF NOT EXISTS idx_date ON daily_entries(entry_date)");
```

### Caching

```javascript
// Cache monthly summaries in JSON files
const cacheFile = `${dataDir}/cache/summary-${month}.json`;

if (fileExists(cacheFile)) {
  return JSON.parse(fs.readFileSync(cacheFile));
} else {
  const result = computeExpensiveSummary();
  fs.writeFileSync(cacheFile, JSON.stringify(result));
  return result;
}
```

---

## Security Architecture

### Data Protection

- ✅ Local storage only (no cloud sync by default)
- ✅ File system permissions (OS-managed)
- ✅ SQLite doesn't support encryption (use OS-level encryption)
- ✅ Environment variables for secrets

### IPC Security

```javascript
// preload.js
contextBridge.exposeInMainWorld("ledgerApi", {
  // Only expose safe methods
  entry: { list, add, update, delete },
  // NOT: filesystem access, OS commands, etc.
});
```

### LAN Sync Security

```javascript
// Basic auth guard (future: token-based)
if (!validateRequest(req)) {
  res.status(401).json({ error: "Unauthorized" });
  return;
}
```

---

## Scalability Notes

### Current Limitations

- SQLite limits: ~1000 entries per day recommended
- No server-side aggregation needed
- Local computation only

### Future Improvements

- Archive old data to secondary database
- Implement data pagination for large datasets
- Add incremental sync for large transfers

---

## Next Steps

- [Database Schema](11-Database-Schema.md) — Detailed DB structure
- [API Reference](12-API-Reference.md) — Complete API documentation
- [Development Guide](05-Development-Guide.md) — Coding practices
