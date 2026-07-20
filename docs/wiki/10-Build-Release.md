# Build & Release

Complete guide to building and releasing HouseLedger.

## Prerequisites

### System Requirements

**Windows:**
- Visual Studio Build Tools 2019+ or Visual Studio Community
- Python 3.x
- Git
- Node.js >= 22

**macOS:**
- Xcode Command Line Tools
- Python 3.x
- Node.js >= 22

**Linux:**
- Build essentials: `sudo apt-get install build-essential python3`
- Node.js >= 22

**Android:**
- Android Studio
- Android SDK (API 21+)
- JDK 11+

### Global npm Packages

```bash
npm install -g electron-builder
```

---

## Building for Desktop

### Windows (x64 & ia32)

```bash
# Build both 64-bit and 32-bit installers
npm run dist:win:all

# Or individual architectures
npm run dist:win        # 64-bit only
npm run dist:win32      # 32-bit only
```

**Output:**
```
release/
├── HouseLedger-0.1.0-x64.exe        # 64-bit installer
├── HouseLedger-0.1.0-ia32.exe       # 32-bit installer
├── HouseLedger-0.1.0-x64.exe.blockmap
├── HouseLedger-0.1.0-ia32.exe.blockmap
├── win-unpacked/                    # Unpacked 64-bit app
└── win-ia32-unpacked/               # Unpacked 32-bit app
```

### macOS (Intel & Apple Silicon)

```bash
# Build for both architectures
npm run dist:mac:all

# Or individual architectures
npm run dist:mac:all    # Intel + Apple Silicon
npm run dist:mac        # Intel (x64) only
npm run dist:mac:arm64  # Apple Silicon only
```

**Output:**
```
release/
├── HouseLedger-0.1.0.dmg           # Universal DMG
├── HouseLedger-0.1.0-arm64.dmg     # Apple Silicon DMG
└── HouseLedger-0.1.0-x64.dmg       # Intel DMG
```

### Linux

```bash
# Build AppImage
npm run dist:dir

# Output: release/win-unpacked/
```

For distribution, use:
```bash
electron-builder --linux AppImage
```

---

## Building for Android

### Prerequisites

1. Install Android Studio
2. Configure Android SDK in `local.properties`
3. Create `service-account.json` for Play Store (optional)

### Build Debug APK

```bash
npm run android:apk:debug
```

**Output:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Build Release APK

```bash
npm run android:apk:release
```

Requires signing configuration in `android/app/build.gradle`

### Open in Android Studio

```bash
npm run android:studio
```

This syncs assets and opens Android Studio for development.

---

## CI/CD Pipeline

### GitHub Actions Workflows

Located in `.github/workflows/`:

#### build-check.yml (PR Validation)

Runs on:
- Pull requests to `master`
- Pushes to `master`

Steps:
1. Checkout code
2. Setup Node.js 24
3. Install dependencies
4. Run tests (`npm test`)
5. Build React (`npm run react:build`)
6. Build Windows x64 (`npm run dist:win`)

**Purpose:** Validate code quality and build integrity

#### release.yml (Automated Release)

Triggers on:
- Push to tag `v*` (e.g., `v0.1.0`)
- Pushes to `master` branch

Steps:
1. Checkout code
2. Setup Node.js 24
3. Install dependencies
4. Run tests
5. Build Windows (x64 + ia32)
6. Upload to GitHub Releases
7. Create release with auto-generated notes

**Output:** Installers available on GitHub Releases page

---

## Release Process

### Version Bump

Update `package.json`:
```json
{
  "version": "0.1.1"
}
```

### Create Release Tag

```bash
# Create annotated tag
git tag -a v0.1.1 -m "Release version 0.1.1"

# Push tag to GitHub
git push origin v0.1.1
```

This triggers `release.yml` workflow.

### GitHub Actions Workflow

1. Workflow starts automatically
2. Builds Windows installers
3. Creates GitHub Release
4. Attaches installers to release
5. Generates release notes from commits

### Download Installers

1. Go to [GitHub Releases](https://github.com/frost-house-ledger/app-money-management/releases)
2. Click latest release
3. Download `.exe` files

---

## Configuration Files

### Electron Builder (electron-builder-config)

Located in `package.json`:

```json
{
  "build": {
    "appId": "com.example.houseledger",
    "productName": "HouseLedger",
    "directories": {
      "buildResources": "build"
    },
    "files": [
      "dist/**/*",
      "Desktop/electron/**/*",
      "package.json"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        }
      ]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

### Vite Config (vite.config.js)

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
});
```

### Capacitor Config (capacitor.config.ts)

```typescript
const config: CapacitorConfig = {
  appId: 'com.example.houseledger',
  appName: 'HouseLedger',
  webDir: 'dist',
  android: {
    minWebViewVersion: 51,
    supportedOrientations: ['portrait', 'landscape']
  }
};
```

---

## Build Optimization

### Code Minification

Vite automatically minifies output:
```bash
npm run react:build
# Creates optimized dist/ folder
```

### Icon Generation

```bash
npm run generate:icons
```

Generates app icons from source:
- Windows: .ico files
- macOS: .icns file
- Android: Adaptive icons

### Cache Electron

GitHub Actions caches Electron binaries:

```yaml
- name: Cache electron-builder
  uses: actions/cache@v6
  with:
    path: |
      ~/.cache/electron
      ~/.cache/electron-builder
```

Reduces build time on CI.

---

## Troubleshooting Builds

### Build Fails: "Cannot find module"

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Electron Build Fails

```bash
# Rebuild native modules
npm run electron:rebuild

# If still fails, clear Electron cache
rm -rf ~/.cache/Electron
npm run dist:win
```

### Windows Installer Size Too Large

- Remove unnecessary dependencies from `package.json`
- Check `asar` settings in electron-builder
- Use `npm audit` to check for duplicate packages

### macOS: Code Signing Issues

Requires Apple Developer certificates (not in public builds).

### Android APK Too Large

- Check for large assets in `dist/`
- Remove unused libraries
- Use ProGuard/R8 minification

---

## Release Checklist

Before releasing:

- [ ] Update version in `package.json`
- [ ] Update `README.md` if features changed
- [ ] Update `CHANGELOG.md` (if maintained)
- [ ] Run `npm test` — all tests pass
- [ ] Build locally: `npm run dist:win:all`
- [ ] Test installer on fresh Windows install
- [ ] Create and push version tag
- [ ] Wait for GitHub Actions to complete
- [ ] Download and verify installers from GitHub Releases
- [ ] Test on Android (if applicable)

---

## Post-Release

### Announce Release

1. Update GitHub Releases with detailed notes
2. Announce on relevant channels (if any)
3. Update documentation if needed

### Monitor Issues

- Watch GitHub Issues for bugs
- Respond to user feedback
- Plan hotfixes if critical issues found

### Next Release

Update roadmap and plan next features.

---

## Advanced: Manual Build (without CI)

### Windows

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build React
npm run react:build

# Package with electron-builder
npx electron-builder --publish never --win nsis --x64 --ia32

# Move exe files
npm run move:exe
```

### macOS

```bash
npm install
npm run react:build
npx electron-builder --publish never --mac --x64 --arm64
```

### Android

```bash
npm install
npm run react:build
npx cap sync android
cd android
gradlew.bat assembleRelease
```

---

## Environment Variables

### Build Configuration

```bash
# Skip code signing (testing)
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:win

# Custom output directory
DIST_OUTPUT_DIR=/custom/path npm run dist:win

# Verbose logging
DEBUG=electron-builder npm run dist:win
```

---

## Next Steps

- [Installation](03-Installation.md) — User installation guide
- [Architecture](06-Architecture.md) — Build system details
- [Development Guide](05-Development-Guide.md) — Local development
