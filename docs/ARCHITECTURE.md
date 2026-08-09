# Architecture

HouseLedger is a local-first finance application with a shared React user interface and platform-specific data adapters.

## High-level flow

```text
React UI
  |
  +-- src/lib/api.js (platform selection)
        |
        +-- Electron: api-electron.js -> preload.cjs -> Electron IPC -> SQLite/files
        |
        +-- Android/Web: api-android.js -> Capacitor SQLite
```

## Main layers

### React application

`src/main.jsx` mounts the application and the global error boundary. `src/App.jsx` owns navigation, selected month, settings, shared loading, and top-level data refreshes.

Feature pages live under `src/components/`:

- daily input and editing
- monthly recurring input and editing
- history
- statistics and category analysis
- settings

The UI should call the API abstraction rather than accessing Electron or SQLite directly.

### API abstraction

`src/lib/api.js` selects the implementation at runtime:

- Electron exposes a restricted API through `contextBridge` in `Desktop/electron/preload.cjs`.
- Android and non-Electron environments use `src/lib/api-android.js` and Capacitor SQLite.

This boundary keeps platform details out of React components.

### Electron main process

`Desktop/electron/main.js` creates the BrowserWindow, registers IPC handlers, starts the optional LAN sync server, and fetches exchange rates with an in-memory cache.

The renderer has `nodeIntegration: false` and uses `contextIsolation: true`. New native operations should be exposed through a narrowly scoped preload method and a matching API adapter method.

### Desktop persistence

`Desktop/electron/db.js` coordinates the data store:

- SQLite stores daily entries, history, and relational data.
- JSON files store recurring items and categories.
- `Desktop/electron/db/migrations.js` and schema helpers keep the SQLite schema compatible across upgrades.
- `Desktop/electron/db/backup.js` implements CSV import/export and sync payload handling.

The database uses SQLite WAL journalling. Do not copy an open database as a backup.

### Android persistence

The Capacitor adapter mirrors the platform API and uses SQLite in the Android application's private storage. Changes to a shared API contract must be implemented and tested for both Electron and Android adapters.

### LAN synchronisation

The Desktop process listens on port `30303` while the application is running. The current endpoints are:

- `GET /sync/ping`
- `GET /sync/export`
- `POST /sync/import`

LAN sync is direct device-to-device HTTP on the local network. It is not a cloud service and currently does not provide end-to-end encryption or authentication.

## Data flow rules

1. Validate external input at the API or persistence boundary.
2. Keep renderer code independent from filesystem paths and native modules.
3. Log detailed failures internally and show concise, actionable UI errors.
4. Update both platform adapters when changing a shared API method.
5. Add or update focused tests for date filtering, import/export, sync payloads, and currency formatting.

## Build targets

- Vite builds the renderer into `dist/`.
- Electron Builder creates Windows installers for `x64` and `ia32`.
- The public 32-bit installer is renamed to `x86` after building; `ia32` remains Electron Builder's internal architecture name.
- Capacitor copies the Vite output into the Android project for native builds.