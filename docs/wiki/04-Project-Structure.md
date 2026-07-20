# Project Structure

Overview of HouseLedger's directory and file organization.

## Directory Tree

```
app-money-management/
├── .github/
│   └── workflows/              # GitHub Actions CI/CD
│       ├── build-check.yml     # Test & build validation
│       └── release.yml         # Automated release pipeline
├── docs/
│   └── wiki/                   # Documentation (this wiki)
├── src/                        # React frontend source
│   ├── components/             # React UI components
│   │   ├── analysis/           # Category analysis & targets
│   │   ├── category/           # Category management
│   │   ├── daily/              # Daily entry forms
│   │   ├── history/            # Transaction history
│   │   ├── monthly/            # Monthly/recurring entries
│   │   ├── settings/           # App settings
│   │   ├── statistics/         # Annual summaries & charts
│   │   ├── ErrorBoundary.jsx   # Error fallback UI
│   │   └── Nav.jsx             # Navigation bar
│   ├── i18n/
│   │   └── translations.js     # Multi-language strings (11 languages)
│   ├── lib/
│   │   ├── api.js              # Platform-agnostic API layer
│   │   ├── api-electron.js     # Electron/Desktop adapter
│   │   ├── api-android.js      # Android/Capacitor adapter
│   │   ├── currency.js         # Currency formatting & conversion
│   │   ├── date.js             # Date utilities
│   │   ├── logger.js           # Error logging
│   │   ├── chartFilterPayloads.js  # Chart data builders
│   │   └── validation.js       # Input validation
│   ├── styles/
│   │   ├── app.css             # Main stylesheet
│   │   ├── common.css          # Common components
│   │   └── ...                 # Additional CSS files
│   ├── App.jsx                 # Main React app component
│   └── main.jsx                # React DOM entry point
├── Desktop/
│   └── electron/               # Electron main process (Node.js)
│       ├── main.js             # Electron app lifecycle
│       ├── preload.js          # contextBridge for IPC
│       ├── db.js               # Ledger database layer
│       ├── db/
│       │   ├── schema-input.js        # SQLite table definitions
│       │   ├── categories.js          # Category store
│       │   ├── recurring.js           # Recurring items logic
│       │   ├── backup.js              # Backup/restore functions
│       │   ├── migrations.js          # Schema migrations
│       │   ├── logs.js                # Input logging
│       │   └── date-utils.js          # Date utilities
│       ├── sync-server.js      # LAN sync HTTP server (port 30303)
│       ├── handlers/           # API request handlers
│       │   ├── entry-handlers.js
│       │   ├── category-handlers.js
│       │   ├── recurring-handlers.js
│       │   ├── summary-handlers.js
│       │   ├── targets-handlers.js
│       │   └── sync-handlers.js
│       └── auth.js             # Simple auth guard
├── android/                    # Capacitor Android project
│   ├── app/
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── MainActivity.kt
│   ├── gradle/
│   ├── build.gradle
│   └── gradlew / gradlew.bat
├── json/                       # Static data files
│   ├── categories.json         # Category definitions
│   ├── currency.json           # Currency codes, names, symbols
│   └── languages.json          # Supported languages
├── test/                       # Jest test files
│   ├── components/             # React component tests
│   └── ...
├── build/                      # Electron-builder output (artifacts)
├── release/                    # Final installers & executables
├── scripts/
│   ├── generate-icons.js       # Icon generation
│   ├── generate-icons.cjs      # Icon generation (CommonJS)
│   ├── kill-running.js         # Kill running Electron process
│   └── rename-unpacked-exes.js # Post-build renaming
├── public/
│   └── index.html              # HTML template
├── babel.config.cjs            # Babel transpiler config
├── capacitor.config.ts         # Capacitor configuration
├── jest.config.cjs             # Jest testing config
├── jest.setup.cjs              # Jest setup file
├── vite.config.js              # Vite bundler config
├── package.json                # NPM dependencies & scripts
├── package-lock.json           # Dependency lock file
├── README.md                   # Main README
├── README_JP.md                # Japanese README
├── SECURITY.md                 # Security policy
└── note.md                     # Developer notes
```

---

## Source Code Organization

### Frontend (React)

**`src/components/`** — Organized by feature/page:

| Directory | Purpose |
|-----------|---------|
| `daily/` | Daily expense entry, list, full editor |
| `monthly/` | Monthly/recurring entry forms |
| `analysis/` | Category breakdown, trend analysis, target setting |
| `statistics/` | Annual summary, savings simulation |
| `settings/` | App settings (currency, language, sync) |
| `history/` | Transaction edit history with diffs |
| `category/` | Category CRUD operations |

**`src/lib/`** — Utility functions:

| File | Purpose |
|------|---------|
| `api.js` | Platform detection & API routing |
| `api-electron.js` | Electron IPC wrapper |
| `api-android.js` | Capacitor SQLite adapter |
| `currency.js` | Formatting, conversion, exchange rates |
| `date.js` | Month/date calculations |
| `validation.js` | Input validation (type, amount, date) |
| `logger.js` | Error logging to console/file |
| `chartFilterPayloads.js` | Build chart data payloads |

**`src/i18n/`** — Internationalization:

```javascript
// translations.js structure
TRANSLATIONS = {
  categoryLabel: { jp: "カテゴリ", en: "Category", ... },
  amountLabel: { jp: "金額", en: "Amount", ... },
  // 100+ keys covering all UI strings
}
```

Supported languages: JP, EN, DE, ES, PT, IT, FR, RU, TW, KO, AR

### Backend (Electron + Node.js)

**`Desktop/electron/`** — Main process & data layer:

| File | Purpose |
|------|---------|
| `main.js` | Electron app initialization, window creation, sync server |
| `preload.js` | IPC bridge (contextBridge) exposing `window.ledgerApi` |
| `db.js` | Ledger store factory & main API |
| `sync-server.js` | HTTP server for LAN sync (REST endpoints) |
| `auth.js` | Simple request auth guard |

**`Desktop/electron/db/`** — Database layer:

| File | Purpose |
|------|---------|
| `schema-input.js` | SQLite DDL + prepared statements |
| `categories.js` | Category store (CRUD, defaults, migration) |
| `recurring.js` | Recurring items logic (JSON-backed) |
| `backup.js` | Backup/export/import |
| `migrations.js` | Schema version migrations |
| `logs.js` | Input logging for audit trail |
| `date-utils.js` | Month/date calculations |

**`Desktop/electron/handlers/`** — API request handlers:

These handle IPC calls from React and map to database operations:
```
entry-handlers.js       → api.entry.*
category-handlers.js    → api.category.*
recurring-handlers.js   → api.recurring.*
summary-handlers.js     → api.summary.*
targets-handlers.js     → api.targets.*
sync-handlers.js        → api.sync.*
```

### Data Files

**`json/`** — Static reference data:

| File | Purpose |
|------|---------|
| `categories.json` | Category presets (id, name, icon, sort) |
| `currency.json` | 100+ currencies (code, name, region, icon) |
| `languages.json` | Language metadata (name, localeCode, dir) |

### Testing

**`test/`** — Jest test suite:

- Component tests (`*.test.jsx`)
- Library tests (`*.test.js`)
- Mocked API & Chart.js responses
- ~80% coverage target

---

## Data Storage

### Desktop (Windows/macOS/Linux)

**Path:** `app.getPath('userData')`
```
Windows:   %APPDATA%\HouseLedger\
macOS:     ~/Library/Application Support/HouseLedger/
Linux:     ~/.config/HouseLedger/
```

**Files:**
```
HouseLedger/
├── ledger.sqlite          # SQLite database
├── recurring-items.json   # Recurring entries (JSON)
├── categories.json        # Custom categories
├── cache/
│   └── monthly-summary-*.json  # Cache files
└── logs/                  # Error logs (optional)
```

### Android

**Path:** App internal storage
```
/data/data/com.example.houseledger/
```

Uses SQLite (via Capacitor @capacitor-community/sqlite).

---

## Entry Points

| Platform | Entry | Purpose |
|----------|-------|---------|
| Web/React | `src/main.jsx` | ReactDOM.createRoot() |
| React App | `src/App.jsx` | Main component with routing |
| Electron | `Desktop/electron/main.js` | Electron app start |
| Preload | `Desktop/electron/preload.js` | IPC bridge setup |
| Android | `android/app/src/main/MainActivity.kt` | Android WebView activity |

---

## Build Artifacts

After `npm run dist:win:all`:

```
release/
├── HouseLedger-0.1.0-x64.exe       # 64-bit installer
├── HouseLedger-0.1.0-ia32.exe      # 32-bit installer
├── win-unpacked/                   # Unpacked 64-bit app
├── win-ia32-unpacked/              # Unpacked 32-bit app
└── *.exe.blockmap                  # Delta update files
```

---

## Key Files to Edit

### Adding UI Features
- **Components:** `src/components/<feature>/<Component>.jsx`
- **Styles:** `src/styles/app.css` or feature CSS
- **Strings:** `src/i18n/translations.js`

### Adding Database Operations
- **API:** `Desktop/electron/handlers/*-handlers.js`
- **Schema:** `Desktop/electron/db/schema-input.js`
- **Business Logic:** `Desktop/electron/db/<feature>.js`

### Configuration
- **Build:** `vite.config.js`, `capacitor.config.ts`
- **Electron:** `Desktop/electron/main.js`
- **Dependencies:** `package.json`

---

## Next Steps

- [Development Guide](05-Development-Guide.md) — Code style & testing
- [Architecture](06-Architecture.md) — System design details
- [API Reference](12-API-Reference.md) — API endpoints
