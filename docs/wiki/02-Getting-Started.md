# Getting Started

This guide will help you set up HouseLedger for development on your machine.

## Prerequisites

Before you start, ensure you have the following installed:

- **Node.js** >= 22 (recommended: 24.x)
- **npm** >= 10
- **Git**
- **Python 3.x** (for building native modules)

### Platform-Specific Requirements

#### Windows
- Visual Studio Build Tools or Visual Studio Community (for native module compilation)
- Windows 7 or later

#### macOS
- Xcode Command Line Tools: `xcode-select --install`
- macOS 10.13 or later

#### Linux
- Build essentials: `sudo apt-get install build-essential python3`
- X11 development libraries for Electron

#### Android Development
- Android Studio (latest)
- Android SDK Platform-Tools
- Java Development Kit (JDK) 11 or later

---

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/frost-house-ledger/app-money-management.git
cd app-money-management
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- React and Vite for frontend development
- Electron for desktop framework
- Capacitor for Android compilation
- Jest for testing
- All other project dependencies

### 3. Verify Installation

```bash
npm test
```

If tests pass, your environment is ready.

---

## Development Workflow

### Start Development Server

```bash
npm run dev
```

This command:
1. Starts Vite dev server on `http://localhost:5173`
2. Launches Electron with hot-reload
3. Opens the HouseLedger window

### Build React for Production

```bash
npm run react:build
```

Outputs compiled React to `dist/` folder.

### Run Tests

```bash
npm test
```

Uses Jest to run all test files matching `*.test.js(x)`.

---

## Troubleshooting Setup

### npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm install

# If specific module fails, rebuild it
npm run electron:rebuild
```

### Port 5173 already in use
```bash
# Kill process using the port (Windows)
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use a different port
VITE_PORT=5174 npm run dev
```

### Electron fails to launch
```bash
# Rebuild native modules
npm run electron:rebuild

# Clear Electron cache
rm -rf ~/AppData/Local/Electron  # Windows
rm -rf ~/Library/Caches/Electron  # macOS
rm -rf ~/.cache/Electron  # Linux
```

### Permission denied on Linux/macOS
```bash
# Add execute permissions
chmod +x ./node_modules/.bin/*
```

---

## Next Steps

1. Read the [Project Structure](04-Project-Structure.md) guide
2. Check out [Development Guide](05-Development-Guide.md) for coding standards
3. Explore the [Architecture](06-Architecture.md) documentation
4. Start hacking! 🎉

---

## IDE Setup (VS Code)

### Recommended Extensions
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- SQLite3 Editor

### Recommended Settings

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

### Debugging

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Electron Dev",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/electron",
      "args": ["."],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

Then press `F5` to start debugging.
