# HouseLedger

Please refer to the [README_JP.md](README_JP.md) for the Japanese version.

<br />

Local-first personal finance — your data stays on your machine.

HouseLedger is a focused, privacy-first finance app built with tauri and React.
It’s lightweight, works offline, and is designed for daily use on desktop and Android (via Capacitor).

## Demo

[Demo video](demo/video/demo_video.mp4)


## **Why I created this app**

| Principle | Description |
|---|---|
| **Simple and focused** | Core features for daily money tracking without bloat. |
| **Privacy-first** | Data is stored locally by default; no cloud account is required. |
| **Fast** | Local storage keeps the app responsive and usable offline. |


## **Features (one-line summary)**

| Feature | Description |
|---|---|
| **Core** | Daily entries, recurring items, and editable history with diffs. |
| **Analysis** | Monthly charts, category breakdowns, and annual summaries. |
| **Sync** | Optional LAN sync between Desktop and Android (no cloud required). |
| **Multi-currency** | Display amounts in multiple currencies with exchange-rate support. |
| **Localization** | Multi-language UI and locale-aware formatting. |


## **Local data storage**

HouseLedger stores all data locally on your device. Desktop builds use Tauri's app data directory, whose default location depends on the operating system:

| OS | Default data directory |
|---|---|
| Windows | `%APPDATA%/HouseLedger` or `%LOCALAPPDATA%/HouseLedger` |
| macOS | `~/Library/Application Support/HouseLedger` |
| Linux | `~/.config/HouseLedger` |

<br />

The data directory contains the following files:

| File | Contents |
|---|---|
| `ledger.sqlite` | Daily entries and input history |
| `recurring-items.json` | Monthly recurring entries |
| `categories.json` | User-defined categories |
| `settings.json` | User preferences and app settings |


## **Tech stack**

| Component | Purpose |
|---|---|
| Tauri + React | Desktop UI and application framework |
| Vite | Development server and build tooling |
| SQLite | Local relational storage for ledger and app data |
| Capacitor | Android WebView wrapper for mobile distribution |
| Node.js | Build scripts and the local LAN sync server |


## **Security & Privacy (specifics)**

- What is never sent: your ledger, transactions, categories, and personal notes are not uploaded anywhere by default.
- LAN sync behavior: when LAN sync is enabled, data is transferred directly between devices on the same local network — nothing is forwarded to third-party servers.
- Telemetry: HouseLedger does not send usage analytics or account identifiers by default.
- Recommendations: enable OS-level disk encryption and use secure backups for extra protection. Encrypted backup/export is planned.


## **LAN Sync (how it works)**

HouseLedger runs a small sync server on the Desktop app while it’s open. Android clients can connect directly to the Desktop server on the local network to exchange data.

Simple diagram (ASCII):

```
Android Device  <--HTTP-->  Desktop (HouseLedger sync server)
			 (Wi‑Fi/LAN)             (port 30303)
```

How to use:
1. Start the Desktop app (it opens the sync server on port `30303`).
2. In the Android app: Settings → LAN sync → enter `http://<DESKTOP-IP>:30303`.
3. Tap **Sync now** (or enable auto-sync).

Notes:
- Sync only works within the same local network.
- The Desktop sync server runs only while the Desktop app is open.
- Data is transferred directly between devices; nothing is uploaded to third-party servers.


## **Installation (quick per-OS)**

- Windows: download the installer (`HouseLedger-Setup-*.exe`) from Releases and run it.
- macOS: use the provided `.dmg` or build with `npm run build:mac` when available.
- Linux: use AppImage or build from source. For development and generic builds:

```bash
npm install
npm run tauri:build
```

Development (run locally):

```bash
npm install
npm run dev
```

Release from `master`:

```bash
npm run release -- -v 0.2
```

The command updates `package.json` and `package-lock.json`, commits them as `release: 0.2`, and pushes `master`. GitHub Actions then creates the matching `v0.2` tag and publishes the Windows installers. Use `--dry-run` to check the release without changing Git.


## **Use on Android (Capacitor)**

1. Install Android Studio (with SDK/Platform Tools).
2. Install dependencies: `npm install`.
3. Sync web assets and open Android Studio: `npm run android:studio`.

Output (debug APK): `android/app/build/outputs/apk/debug/houseledger-debug.apk`


## **Documentation**

- [Backup and restore](docs/DATA_BACKUP.md) — backup methods, restore steps, storage locations, CSV scope, and LAN sync precautions.
- [Architecture](docs/ARCHITECTURE.md) — React, tauri, SQLite, Capacitor, API adapters, and LAN sync responsibilities.
- [Release Guide](docs/RELEASE.md) — release commands, dry runs, branch requirements, and the Windows x64 installer.
- [Security Policy](SECURITY.md) — vulnerability reporting and security guidance.


## **Roadmap**

- Encrypted backups and optional end-to-end encrypted sync (opt-in)
- Live exchange-rate management with auto refresh and manual override
- Improved Android UI and offline resilience
- More locales and translation polish
- CSV import/export improvements (mapping, category matching)


## **License**

Free for personal and commercial use.
However, you need to contact the author and developer for commercial use.


### **Support**

If you find this app useful, please consider supporting its development. 
Your support helps maintain and improve the app.

Support: <a href="https://github.com/sponsors/KFrost-Sponsor" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; cursor: pointer;">GitHub Sponsors</a>
