# AMM – App Money Management

A local-first personal finance app built with Electron + React. All data is stored on your machine — no cloud, no accounts required.

## Features

- **Monthly recurring entries** — Register fixed income/expenses (e.g. rent, salary) once and they carry forward automatically
- **Daily entries** — Log day-to-day spending with date, category, and notes
- **Charts** — Monthly bar/line chart and category breakdown (pie + stacked bar)
- **Multi-currency** — Display amounts in JPY, NZD, EUR, and more with live exchange rates
- **History log** — Track every add, update, and delete with before→after diff view
- **Annual summary** — Year-at-a-glance overview
- **Multi-language** — Japanese / English / German

## Installation

Download `AMM-Setup-x64.exe` (64-bit) or `AMM-Setup-ia32.exe` (32-bit) from [Releases](../../releases) and run the installer.

## Development Setup

```bash
npm install
npm run dev
```

## Use On Android (Capacitor)

This project runs on Android via Capacitor (WebView), **not** via React Native.

1. Install Android Studio (with SDK/Platform Tools)
2. Install dependencies

```bash
npm install
```

3. Sync web assets and open Android Studio

```bash
npm run android:studio
```

4. In Android Studio, select an emulator/device and click Run

To build a debug APK from CLI:

```bash
npm run android:apk:debug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Desktop / Android Sync (Same LAN)

The Desktop app starts a sync server automatically while running (port `30303`).

1. Start the Desktop app
2. Open Android app and go to Settings > LAN sync
3. Set `Desktop URL` to `http://<Desktop-IP>:30303`
4. Press Sync now for manual sync
5. Optionally enable auto-sync every minute

Example: `http://192.168.1.10:30303`

Notes:
- Sync works only within the same network
- The sync server stops when the Desktop app is closed

## Data Storage

All data is stored locally in your OS user data folder (not bundled in the app).

| File | Contents |
|---|---|
| `ledger.sqlite` | Daily entries and input history |
| `recurring-items.json` | Monthly recurring entries |
