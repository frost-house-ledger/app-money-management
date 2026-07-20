# Development Guide

Standards, best practices, and workflows for contributing to HouseLedger.

## Code Style

### JavaScript/JSX

We follow a relaxed but consistent style:

**Naming:**
- Components: PascalCase (`DailyEntryPage.jsx`)
- Functions/variables: camelCase (`getCurrencyIcon()`)
- Constants: UPPERCASE (`SYNC_PORT = 30303`)

**Formatting:**
```javascript
// Use semicolons
const value = 42;

// 2-space indentation
if (condition) {
  doSomething();
}

// JSX on multiple lines
return (
  <div>
    <Component prop="value" />
  </div>
);
```

**Imports:**
```javascript
// Group imports: React, third-party, local
import React, { useState } from "react";
import { api } from "../../lib/api.js";
import DailySection from "./DailySection.jsx";
```

### File Organization

**React Components:**
```javascript
import React, { useState, useEffect } from "react";

// Props definition (optional JSDoc)
/**
 * MyComponent - Brief description
 * @param {Object} props
 * @param {string} props.title - Title text
 * @returns {JSX.Element}
 */
export default function MyComponent({ title, onSave, t }) {
  // State
  const [value, setValue] = useState("");
  
  // Effects
  useEffect(() => {
    // Setup
    return () => {
      // Cleanup
    };
  }, []);
  
  // Event handlers
  function handleSave() {
    onSave(value);
  }
  
  // Render
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleSave}>{t.saveButton}</button>
    </div>
  );
}
```

**Node.js Modules:**
```javascript
// Exports at the bottom
export function createService(config) {
  return {
    // methods
  };
}

export const CONSTANTS = { /* ... */ };
```

---

## React Patterns

### Props & Destructuring

Always destructure required props:
```javascript
function DailySection({
  dailyForm,
  setDailyForm,
  onSubmit,
  t
}) {
  // ...
}
```

### State Management

Keep state local to component when possible:
```javascript
const [isOpen, setIsOpen] = useState(false);
const [selectedCategory, setSelectedCategory] = useState("food");
```

For complex state, consider useReducer:
```javascript
const [state, dispatch] = useReducer(reducer, initialState);

function reducer(state, action) {
  switch (action.type) {
    case "SET_CATEGORY":
      return { ...state, categoryId: action.payload };
    default:
      return state;
  }
}
```

### Async Operations

Use useEffect for data fetching:
```javascript
useEffect(() => {
  async function loadData() {
    try {
      const result = await api.entry.list({ month });
      setEntries(result);
    } catch (err) {
      logError("loadData", err);
      setError(err.message);
    }
  }
  
  loadData();
}, [month]);
```

Avoid:
```javascript
// ❌ DON'T: Make useEffect async directly
useEffect(async () => {
  // This doesn't work correctly
}, []);
```

### Memoization

Use `useMemo` for expensive calculations:
```javascript
const total = useMemo(() => {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}, [rows]);
```

---

## API Layer

### Adding New API Endpoints

1. **Add handler in `Desktop/electron/handlers/`:**

```javascript
// entry-handlers.js
export function createEntryHandlers(ledger) {
  return {
    list: (event, payload) => {
      return ledger.listEntries(payload);
    },
    add: (event, payload) => {
      return ledger.addEntry(payload);
    }
  };
}
```

2. **Register in preload.js:**

```javascript
contextBridge.exposeInMainWorld("ledgerApi", {
  entry: createEntryHandlers(ledger),
  // ...
});
```

3. **Update api-electron.js:**

```javascript
export function createElectronApi() {
  return {
    entry: {
      list: (payload) => window.ledgerApi.entry.list(payload),
      add: (payload) => window.ledgerApi.entry.add(payload),
      // ...
    }
  };
}
```

4. **Use in React:**

```javascript
const entries = await api.entry.list({ month: "2023-01" });
```

### Android Adapter

Update `api-android.js` with Capacitor SQLite equivalent:

```javascript
export function createAndroidApi() {
  return {
    entry: {
      list: async (payload) => {
        const db = await getDb();
        const result = await db.query("SELECT * FROM daily_entries ...");
        return result.values;
      }
    }
  };
}
```

---

## Database Operations

### Adding Tables

Edit `Desktop/electron/db/schema-input.js`:

```javascript
export function ensureLedgerSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS my_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
```

### Writing Queries

Use prepared statements:
```javascript
const stmt = db.prepare(`
  SELECT * FROM daily_entries
  WHERE entry_date BETWEEN ? AND ?
  ORDER BY entry_date DESC
`);

const result = stmt.all(fromDate, toDate);
```

Named parameters (clearer):
```javascript
const stmt = db.prepare(`
  SELECT * FROM daily_entries
  WHERE entry_date BETWEEN @from AND @to
  ORDER BY entry_date DESC
`);

const result = stmt.all({ from: fromDate, to: toDate });
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- DailySection

# Run with coverage
npm test -- --coverage

# Watch mode (re-run on file change)
npm test -- --watch
```

### Writing Tests

Use Jest + React Testing Library:

```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DailySection from '../DailySection.jsx';

const mockT = {
  saveButton: 'Save',
  cancelButton: 'Cancel',
  // ...
};

describe('DailySection', () => {
  it('renders form inputs', () => {
    render(
      <DailySection
        dailyForm={{ type: 'fee', amount: '', title: '' }}
        setDailyForm={jest.fn()}
        onSubmit={jest.fn()}
        t={mockT}
      />
    );
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onSubmit when save button clicked', async () => {
    const onSubmit = jest.fn();
    render(
      <DailySection
        dailyForm={{ type: 'fee', amount: 100, title: 'Lunch' }}
        setDailyForm={jest.fn()}
        onSubmit={onSubmit}
        t={mockT}
      />
    );
    
    fireEvent.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
```

### Mocking API Calls

```javascript
jest.mock('../../../src/lib/api', () => ({
  api: {
    entry: {
      list: jest.fn().mockResolvedValue([
        { id: 1, title: 'Lunch', amount: 1000 }
      ])
    }
  }
}));
```

---

## Localization

### Adding New Strings

1. Edit `src/i18n/translations.js`:

```javascript
const TRANSLATIONS = {
  // ... existing keys
  
  myNewString: {
    jp: "新しい文字列",
    en: "New string",
    de: "Neue Zeichenkette",
    es: "Nueva cadena",
    pt: "Nova string",
    it: "Nuova stringa",
    fr: "Nouvelle chaîne",
    ru: "Новая строка",
    tw: "新字符串",
    ko: "새 문자열",
    ar: "سلسلة جديدة"
  }
};
```

2. Use in component:

```javascript
function MyComponent({ t }) {
  return <h1>{t.myNewString}</h1>;
}
```

### Translation Coverage

All UI strings should use `t.key` pattern. Hardcoded strings are acceptable only for:
- Technical identifiers
- Category names (already in database)
- Error messages (logged)

---

## Error Handling

### In React Components

```javascript
try {
  const result = await api.entry.add(payload);
  setToast("Entry added successfully");
} catch (err) {
  logError("addEntry", err);
  setError(t.errorSaveFailedText);
}
```

### In Node.js Backend

```javascript
try {
  validateMonth(month);
  const result = ledger.getMonth(month);
  return { ok: true, data: result };
} catch (err) {
  logError("getMonth", err);
  return { ok: false, error: err.message };
}
```

### Error Boundary

Components are wrapped with `ErrorBoundary` for rendering errors:

```javascript
export default class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logError("ErrorBoundary", error);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
```

---

## Performance Tips

### Memoize Components

```javascript
const DailyEntryRow = React.memo(({ entry, onDelete }) => {
  return <tr>...</tr>;
});
```

Helps prevent re-renders of list items.

### Lazy Load Routes

```javascript
const HistoryPage = React.lazy(() => import("./HistoryPage.jsx"));

// In router
<Suspense fallback={<Loading />}>
  <HistoryPage />
</Suspense>
```

### Avoid Inline Functions

```javascript
// ❌ BAD: Creates new function on every render
<button onClick={() => setOpen(true)}>Open</button>

// ✅ GOOD: Use event handler
<button onClick={handleOpen}>Open</button>
```

---

## Git Workflow

### Branching

```bash
# Create feature branch
git checkout -b feature/add-dark-mode

# Create fix branch
git checkout -b fix/sync-crash

# Create docs branch
git checkout -b docs/update-readme
```

### Commits

Write clear commit messages:
```
# Good
fix: resolve currency conversion error in category analysis

# Good
feat: add percentage display to category breakdown

# Avoid
fixed stuff
```

### Pull Requests

1. Push your branch
2. Create PR on GitHub
3. Link related issues: `Fixes #123`
4. Wait for CI checks (build, tests)
5. Request review
6. Merge when approved

---

## Common Tasks

### Update Dependencies

```bash
npm outdated                    # Check for updates
npm install <package>@latest   # Update specific package
npm audit fix                  # Fix security issues
npm update                     # Update all (careful!)
```

### Rebuild Native Modules

```bash
npm run electron:rebuild
```

### Clear Build Artifacts

```bash
# Windows
rmdir /s dist release node_modules

# Linux/macOS
rm -rf dist release node_modules
```

---

## Next Steps

- [Architecture](06-Architecture.md) — System design
- [Database Schema](11-Database-Schema.md) — Data model
- [API Reference](12-API-Reference.md) — Full API docs
