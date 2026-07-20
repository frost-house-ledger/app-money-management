# FAQ & Troubleshooting

Common questions and solutions.

## General Questions

### Q: Is my data really private?

**A:** Yes. HouseLedger stores all data **locally on your device** by default.

- ✅ No cloud upload
- ✅ No servers
- ✅ No telemetry
- ✅ No account required

The only data sent over the network is:
- LAN sync (optional, to your own Android device)
- Exchange rate updates (if enabled)

See [Security Policy](https://github.com/frost-house-ledger/app-money-management/blob/master/SECURITY.md).

### Q: Can I use HouseLedger offline?

**A:** Yes! HouseLedger is designed to work **100% offline**.

- ✅ Desktop app: Fully offline
- ✅ Android app: Works offline
- ✅ LAN Sync: Works on local Wi-Fi (no internet needed)
- ✅ Exchange rates: Optional (cached locally)

### Q: How much data can I store?

**A:** Practically unlimited for personal use.

- Typical user: 100-200 entries/month = 1,200-2,400/year
- SQLite limit: Supports databases up to terabytes
- Recommended: Archive data older than 3-5 years for performance

### Q: Can I export my data?

**A:** Yes, multiple formats:

1. **CSV Export** — Settings → Export to CSV
2. **Database File** — Copy `ledger.sqlite` directly
3. **Backup** — Automatic WAL backups

See [Installation](03-Installation.md#data-backup).

### Q: Is there a web version?

**A:** Not currently. Roadmap includes potential web version, but focus is on Desktop + Android.

---

## Installation & Setup

### Q: Where is my data stored?

**A:** Depends on your platform:

| Platform | Location |
|----------|----------|
| Windows | `%APPDATA%\HouseLedger\` |
| macOS | `~/Library/Application Support/HouseLedger/` |
| Linux | `~/.config/HouseLedger/` |
| Android | Internal app storage |

### Q: Can I move data between devices?

**A:** Yes, two methods:

1. **LAN Sync** — Best for Desktop ↔ Android
   - Settings → LAN Sync → Configure
   - Works on home Wi-Fi

2. **Manual Export/Import** — For any migration
   - Export CSV from old device
   - Import CSV on new device

See [LAN Sync Guide](08-LAN-Sync-Deep-Dive.md).

### Q: The installer is blocked by Windows Defender

**A:** This is a SmartScreen warning for unsigned installers.

**Solution:**
1. Click "More info"
2. Click "Run anyway"
3. Or disable SmartScreen temporarily

The app is safe (open source on GitHub).

### Q: Permission denied error on Linux/macOS

**A:** Node.js build files need execute permissions.

**Solution:**
```bash
chmod +x ./node_modules/.bin/*
npm install
```

---

## Usage

### Q: How do I add a recurring expense?

**A:** Recurring items handle monthly/annual transactions:

1. Go to "Monthly" page
2. Scroll to "Recurring Items"
3. Click "Add Recurring Item"
4. Set type (Fee/Income), category, amount
5. Set start and end months
6. Save

Recurring items are added to monthly totals automatically.

### Q: Can I modify a past entry?

**A:** Yes! Click on any entry to edit:

1. Find entry in Daily or Monthly view
2. Click on the entry row
3. Full editor opens
4. Modify any field
5. Save

Changes are logged in History.

### Q: How do I delete an entry?

**A:** 

1. Click on the entry
2. Full editor opens
3. Click "Delete" button
4. Confirm deletion

Entry is moved to history (not permanently erased).

### Q: Can I search for entries?

**A:** Currently filtering is available:

- By category (dropdown)
- By date range (date picker)
- By month (month selector)

Full text search coming in future version.

### Q: What currencies are supported?

**A:** 100+ currencies including:

- Major: JPY, USD, EUR, GBP, CNY, KRW
- Many others: AUD, CAD, CHF, INR, MXN, SEK, etc.

See Settings → Currency to change.

### Q: Exchange rates are wrong

**A:** Exchange rates:

- Auto-updated daily from external source
- Can be manually overridden in Settings
- Show "Last updated: ..." timestamp

**Fix:**
1. Settings → Check last update
2. Manually refresh if needed
3. Or manually override rate

---

## Features & Configuration

### Q: What's the difference between "Fee" and "Income"?

**A:**
- **Fee** — Money out (expenses)
- **Income** — Money in (salary, bonuses)

Balance = Total Income - Total Fees

### Q: How do categories work?

**A:** Categories organize expenses:

- 13 default categories (Food, Transport, etc.)
- Create custom categories
- Assign each entry to a category
- View spending by category in Analysis page

### Q: Can I hide unused categories?

**A:** Yes, set as inactive:

1. Settings → Manage Categories
2. Find category
3. Toggle "Active" off
4. Inactive categories hidden from dropdowns

### Q: How do budget targets work?

**A:**
1. Analysis page → "Set Target Amount"
2. Enter monthly limit for each category
3. Save

Then in Analysis:
- Actual amount < Target → Normal display
- Actual amount > Target → Shown in red

---

## LAN Sync Issues

### Q: "Connection refused" error

**A:** Desktop app not running or sync server not started.

**Solution:**
1. Start HouseLedger Desktop
2. Wait 2-3 seconds for sync server
3. Verify IP in Settings → LAN Sync
4. Retry sync

See [LAN Sync Troubleshooting](08-LAN-Sync-Deep-Dive.md#troubleshooting-sync).

### Q: "Cannot reach server" error

**A:** Devices not on same Wi-Fi network.

**Solution:**
1. Both devices: Check connected to same Wi-Fi (SSID)
2. Disable mobile data on Android
3. Check router firewall
4. Try ping between devices

### Q: Sync takes too long

**A:** Large dataset transfer or slow network.

**Solution:**
1. Check Wi-Fi signal strength
2. Reduce database size (archive old entries)
3. Retry on faster network
4. Check port 30303 not blocked

### Q: Which device data is kept after sync?

**A:** Last-update-wins strategy:

- Entry with newer `updatedAt` timestamp is kept
- Older version logged in History
- No data loss (review History if unsure)

---

## Performance

### Q: App is slow/laggy

**A:** Possible causes:

1. **Large database** — Too many entries
   - Solution: Archive old data to CSV

2. **Low memory device** — Especially Android
   - Solution: Close other apps, restart HouseLedger

3. **Slow disk** — Database I/O bottleneck
   - Solution: Check disk space available

### Q: Charts don't render

**A:** Chart.js initialization failed.

**Solution:**
1. Restart app
2. Clear browser cache (if web version)
3. Check browser console for errors
4. Report issue on GitHub

### Q: Database is corrupted

**A:** SQLite database may be corrupted.

**Solution:**
1. Close app
2. Copy ledger.sqlite to backup location
3. Delete corrupted ledger.sqlite
4. Restart app (creates new empty database)
5. Restore from backup if needed

---

## Errors & Debugging

### Q: "Cannot find ledger.sqlite"

**A:** Database doesn't exist yet (first run).

**Solution:**
- Normal on first launch
- Close app and restart
- Database created automatically
- No action needed

### Q: "Database locked" error

**A:** Another process using database.

**Causes:**
- Two instances of HouseLedger running
- File explorer has database open

**Solution:**
1. Close all other instances
2. Wait 10 seconds
3. Restart app

### Q: "Sync format mismatch"

**A:** Different app versions using incompatible formats.

**Solution:**
1. Update both apps to latest version
2. Retry sync

### Q: Data missing after crash

**A:** Database may have been recovering.

**Solution:**
1. Close and restart app
2. Wait for recovery
3. Check if data returned

**Prevention:**
- Regular backups (Settings → Export)
- Use OS-level disk encryption

### Q: How do I see debug logs?

**A:** Logs are written to:

- **Desktop:** `%APPDATA%\HouseLedger\logs\` (if logging enabled)
- **Android:** Logcat (use Android Studio)
- **Browser:** DevTools console (if web version)

---

## Reporting Issues

### Found a bug?

1. **Check** [GitHub Issues](https://github.com/frost-house-ledger/app-money-management/issues)
2. **Open new issue** with:
   - App version (`About` page)
   - Platform (Windows, macOS, Linux, Android)
   - Steps to reproduce
   - Screenshots/logs

### Security vulnerability?

**Do NOT create public issue.** Follow [SECURITY.md](https://github.com/frost-house-ledger/app-money-management/blob/master/SECURITY.md).

---

## System Requirements

### Minimum

- **Desktop:**
  - Windows 7+
  - macOS 10.13+
  - Linux (Ubuntu 18.04+)

- **Android:**
  - Android 5.0+ (API 21+)
  - 50MB storage

### Recommended

- **Desktop:**
  - Windows 10/11
  - macOS 11+
  - Ubuntu 20.04+
  - 500MB storage
  - 2GB RAM

- **Android:**
  - Android 10+
  - 200MB storage
  - 2GB RAM

---

## Getting Help

1. **Check this FAQ** — Most issues covered
2. **Read [docs/wiki](01-Home.md)** — Comprehensive guides
3. **Search [GitHub Issues](https://github.com/frost-house-ledger/app-money-management/issues)** — Similar issues
4. **Open [GitHub Issue](https://github.com/frost-house-ledger/app-money-management/issues/new)** — New problems
5. **Email maintainer** — For private matters

---

## Feature Requests

Have an idea? Open a GitHub issue with label `enhancement`:

1. Describe feature clearly
2. Explain use case
3. Consider implementation complexity
4. Include mockups (if UI-related)

Most requested features:
- Tags for flexible categorization
- Budget alerts & notifications
- More chart types
- Investment tracking
- Loan/debt management

---

## Next Steps

- [Features](07-Features.md) — All capabilities
- [Installation](03-Installation.md) — Setup guide
- [LAN Sync Deep Dive](08-LAN-Sync-Deep-Dive.md) — Sync details
- [GitHub Issues](https://github.com/frost-house-ledger/app-money-management/issues) — Report bugs
