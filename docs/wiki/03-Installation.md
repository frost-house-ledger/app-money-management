# Installation Guide

Complete installation instructions for all platforms.

## Windows

### Download Installer

1. Go to [GitHub Releases](https://github.com/frost-house-ledger/app-money-management/releases)
2. Download the latest `HouseLedger-x.x.x.exe` installer
3. Double-click the installer and follow the wizard
4. HouseLedger will be installed to `C:\Program Files\HouseLedger\` (or `Program Files (x86)` for 32-bit)

### Data Location

Your financial data is stored in:
```
%APPDATA%\HouseLedger\
```

Or equivalently:
```
C:\Users\YourUsername\AppData\Roaming\HouseLedger\
```

### Uninstall

Use Windows "Add or Remove Programs" or run the uninstaller from the installation directory.

---

## macOS

### Download & Install

1. Download the latest `.dmg` file from [GitHub Releases](https://github.com/frost-house-ledger/app-money-management/releases)
2. Open the DMG file
3. Drag HouseLedger to the Applications folder
4. Launch from Applications folder (or Launchpad)

### Data Location

Your financial data is stored in:
```
~/Library/Application Support/HouseLedger/
```

### Build from Source (for M1/Apple Silicon)

If pre-built version isn't available for your architecture:
```bash
git clone https://github.com/frost-house-ledger/app-money-management.git
cd app-money-management
npm install
npm run dist:mac:all
```

---

## Linux

### AppImage (Recommended)

1. Download the latest `HouseLedger-*.AppImage` from [GitHub Releases](https://github.com/frost-house-ledger/app-money-management/releases)
2. Make it executable:
   ```bash
   chmod +x HouseLedger-*.AppImage
   ```
3. Run it:
   ```bash
   ./HouseLedger-*.AppImage
   ```

### Build from Source

```bash
git clone https://github.com/frost-house-ledger/app-money-management.git
cd app-money-management
npm install
npm run dist:dir  # Creates portable app in release/ folder
```

### Data Location

Your financial data is stored in:
```
~/.config/HouseLedger/
```

---

## Android

### Prerequisites

- Android 5.0 (API level 21) or later
- 50MB free storage

### Install from APK

1. Download the latest `.apk` file from [GitHub Releases](https://github.com/frost-house-ledger/app-money-management/releases)
2. Enable "Install from Unknown Sources" in Android Settings
3. Open the APK file with your file manager
4. Tap "Install"

### Build Debug APK

```bash
npm install
npm run android:apk:debug
```

APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Data Location

Your financial data is stored in the app's internal storage:
```
/data/data/com.example.houseledger/
```

---

## Build from Source (All Platforms)

### 1. Clone Repository

```bash
git clone https://github.com/frost-house-ledger/app-money-management.git
cd app-money-management
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build for Your Platform

**Windows (x64 + ia32):**
```bash
npm run dist:win:all
```

**macOS (Intel + Apple Silicon):**
```bash
npm run dist:mac:all
```

**Android:**
```bash
npm run android:apk:release
```

**Linux (AppImage):**
```bash
npm run dist:dir
```

### 4. Find Your Build

Installers and binaries are in the `release/` folder.

---

## Data Backup

Your financial data is automatically stored locally:

| Platform | Location |
|----------|----------|
| Windows | `%APPDATA%\HouseLedger\` |
| macOS | `~/Library/Application Support/HouseLedger/` |
| Linux | `~/.config/HouseLedger/` |
| Android | `/data/data/com.example.houseledger/` |

### Manual Backup

1. Locate your data folder (see above)
2. Copy `ledger.sqlite` and `recurring-items.json` to a safe location
3. Keep backups on external drives or cloud storage (encrypted)

### Restore from Backup

1. Close HouseLedger
2. Replace the files in your data folder with backed-up versions
3. Restart HouseLedger

---

## Security Considerations

- ✅ Data is stored **locally by default** — not uploaded anywhere
- ✅ Use **OS-level disk encryption** (BitLocker, FileVault, LUKS) for added protection
- ✅ **Back up regularly** to external encrypted storage
- ⏳ Encrypted backup/export feature coming soon

For security vulnerabilities, see [SECURITY.md](https://github.com/frost-house-ledger/app-money-management/blob/master/SECURITY.md).

---

## Uninstall

### Windows
- Use Windows "Add or Remove Programs"
- Or run uninstaller from installation directory

### macOS
- Drag HouseLedger from Applications to Trash
- Empty Trash

### Linux
- Delete the AppImage file
- Delete `~/.config/HouseLedger/` (optional)

### Android
- Long-press app icon → Uninstall
- Or use Settings → Apps → HouseLedger → Uninstall

---

## Troubleshooting

### "Cannot find ledger.sqlite"
- This happens on first run (normal)
- Close app and restart — database will be created automatically

### App crashes on startup
- Check [FAQ & Troubleshooting](13-FAQ-Troubleshooting.md)
- Try deleting the app data folder and reinstalling
- Report issue on [GitHub Issues](https://github.com/frost-house-ledger/app-money-management/issues)

### Data missing after update
- Check backup locations (see above)
- Reinstall and restore from backup
- Never delete the data folder while app is running

---

## Next Steps

- Read the [Features](07-Features.md) guide
- Set up [LAN Sync](08-LAN-Sync-Deep-Dive.md) between devices
- Learn about [Localization](09-Localization.md) settings
