# HouseLedger

Please refer to the [README_JP.md](README_JP.md) for the Japanese version.

<br />

Local-first personal finance — your data stays on your machine.

HouseLedger is a focused, privacy-first finance app built with Electron and React.
It’s lightweight, works offline, and is designed for daily use on desktop and Android (via Capacitor).

## Demo

[Demo video](demo/video/HouseLedger-demo.mp4)

## Why I created this app

- **Simple and focused**: core features for daily money tracking without bloat.
- **Privacy-first**: data is stored locally by default; no cloud account is required.
- **Fast**: local storage keeps the app responsive and usable offline.


## Features (one-line summary)

- **Core** — Daily entries, recurring items, and editable history with diffs.
- **Analysis** — Monthly charts, category breakdowns, and annual summaries.
- **Sync** — Optional LAN sync between Desktop and Android (no cloud required).
- **Multi-currency** — Display amounts in multiple currencies with exchange-rate support.
- **Localization** — Multi-language UI and locale-aware formatting.


## Tech stack

| Component | Purpose |
|---|---|
| Electron + React | Desktop UI and application framework |
| Vite | Development server and build tooling |
| SQLite | Local relational storage for ledger and app data |
| Capacitor | Android WebView wrapper for mobile distribution |
| Node.js | Build scripts and the local LAN sync server |

## Security & Privacy (specifics)

- Storage location: data is saved in the Electron user data directory (`app.getPath('userData')`). Typical paths:
	- Windows: `%APPDATA%/HouseLedger` or `%LOCALAPPDATA%/HouseLedger`
	- macOS: `~/Library/Application Support/HouseLedger`
	- Linux: `~/.config/HouseLedger`
- What is never sent: your ledger, transactions, categories, and personal notes are not uploaded anywhere by default.
- LAN sync behavior: when LAN sync is enabled, data is transferred directly between devices on the same local network — nothing is forwarded to third-party servers.
- Telemetry: HouseLedger does not send usage analytics or account identifiers by default.
- Recommendations: enable OS-level disk encryption and use secure backups for extra protection. Encrypted backup/export is planned.

## LAN Sync (how it works)

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

## Installation (quick per-OS)

- Windows: download the installer (`HouseLedger-Setup-*.exe`) from Releases and run it.
- macOS: use the provided `.dmg` or build with `npm run build:mac` when available.
- Linux: use AppImage or build from source. For development and generic builds:

```bash
npm install
npm run build
```

Development (run locally):

```bash
npm install
npm run dev
```

## Use on Android (Capacitor)

1. Install Android Studio (with SDK/Platform Tools).
2. Install dependencies: `npm install`.
3. Sync web assets and open Android Studio: `npm run android:studio`.

Output (debug APK): `android/app/build/outputs/apk/debug/houseledger-debug.apk`

## Data storage

All app data is stored locally in the user's app data folder.

| File | Contents |
|---|---|
| `ledger.sqlite` | Daily entries and input history |
| `recurring-items.json` | Monthly recurring entries |

## Roadmap

- Encrypted backups and optional end-to-end encrypted sync (opt-in)
- Live exchange-rate management with auto refresh and manual override
- Improved Android UI and offline resilience
- More locales and translation polish
- CSV import/export improvements (mapping, category matching)
