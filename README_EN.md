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

## Data Storage

All data is stored locally in your OS user data folder (not bundled in the app).

| File | Contents |
|---|---|
| `ledger.sqlite` | Daily entries and input history |
| `recurring-items.json` | Monthly recurring entries |
