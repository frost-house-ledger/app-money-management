# HouseLedger Wiki

Welcome to the HouseLedger project documentation. This wiki contains comprehensive guides for developers, users, and contributors.

## Quick Navigation

### 🚀 Getting Started
- [Getting Started](02-Getting-Started.md) — Set up your development environment
- [Installation](03-Installation.md) — Install HouseLedger on your platform

### 📚 Development
- [Project Structure](04-Project-Structure.md) — Understand the codebase organization
- [Development Guide](05-Development-Guide.md) — Coding standards and best practices
- [Architecture](06-Architecture.md) — Deep dive into system design

### 🎯 Features
- [Features Overview](07-Features.md) — Detailed feature descriptions
- [LAN Sync Deep Dive](08-LAN-Sync-Deep-Dive.md) — How synchronization works
- [Localization](09-Localization.md) — Multi-language support

### 🔨 Building & Deployment
- [Build & Release](10-Build-Release.md) — Building for Windows, macOS, Linux, Android
- [Database Schema](11-Database-Schema.md) — Data model and relations

### 📋 Reference
- [API Reference](12-API-Reference.md) — Backend API endpoints and methods
- [FAQ & Troubleshooting](13-FAQ-Troubleshooting.md) — Common issues and solutions
- [Contributing](14-Contributing.md) — How to contribute to the project

---

## About HouseLedger

HouseLedger is a **local-first personal finance application** built with:
- **Electron + React** for desktop
- **Capacitor** for Android mobile
- **SQLite** for local data storage
- **Node.js** for build automation and LAN sync

### Core Philosophy

✅ **Privacy First** — Your data stays on your machine  
✅ **Lightweight** — Minimal dependencies and bloat  
✅ **Offline Ready** — Works without internet connection  
✅ **Multi-Platform** — Desktop (Windows, macOS, Linux) and Android  
✅ **Multi-Currency** — Support for 100+ currencies with exchange rates  
✅ **Multi-Language** — UI and formatting in 11 languages  

---

## Project Status

| Version | Status |
|---------|--------|
| 0.1.0   | Stable |

### Roadmap

- 🔐 Encrypted backups and optional end-to-end sync
- 💱 Live exchange-rate management with auto-refresh
- 📱 Improved Android UI and offline resilience
- 🌍 More locales and translation improvements
- 📊 CSV import/export enhancements

---

## Repository Information

- **GitHub**: [frost-house-ledger/app-money-management](https://github.com/frost-house-ledger/app-money-management)
- **License**: ISC
- **Node.js**: Requires >= 22
- **Current Branch**: dev
- **Default Branch**: master

---

## Quick Commands

```bash
# Development
npm install              # Install dependencies
npm run dev             # Start dev server (Electron + React)
npm test               # Run tests

# Building
npm run dist:win:all   # Build Windows installers (x64 + ia32)
npm run dist:mac:all   # Build macOS app
npm run android:apk:debug  # Build Android debug APK

# Android development
npm run android:studio # Open Android Studio with synced assets
```

---

## Support & Contact

For issues, feature requests, or questions:
- Open a GitHub Issue
- Check [FAQ & Troubleshooting](13-FAQ-Troubleshooting.md)
- Review the [SECURITY.md](https://github.com/frost-house-ledger/app-money-management/blob/master/SECURITY.md) for security concerns
