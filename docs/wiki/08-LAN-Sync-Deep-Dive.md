# LAN Sync Deep Dive

Detailed technical guide to the LAN sync system.

## Overview

LAN (Local Area Network) sync allows HouseLedger to synchronize data between Desktop and Android devices **without uploading to the cloud**. Both devices stay on your home Wi-Fi and exchange data directly.

### Architecture

```
┌──────────────────┐              ┌─────────────────┐
│  Desktop         │   Wi-Fi      │  Android        │
│  HouseLedger     │<──────────>  │  HouseLedger    │
│  (Sync Server)   │   HTTP       │  (Sync Client)  │
│  Port 30303      │   REST       │                 │
└──────────────────┘              └─────────────────┘
```

## Server Side (Desktop)

### Starting the Sync Server

When HouseLedger starts on Desktop, it automatically launches a sync server:

```javascript
// Desktop/electron/main.js
const syncServer = startSyncServer(ledger);
syncServer.listen(30303, '0.0.0.0');
```

The server:
- Listens on **port 30303** on all interfaces
- Stays active only while app is running
- Handles HTTP requests from Android

### Server Endpoints

#### GET `/api/sync/server-info`

Get server metadata:

**Request:**
```http
GET /api/sync/server-info HTTP/1.1
Host: 192.168.1.100:30303
```

**Response:**
```json
{
  "appName": "HouseLedger",
  "appVersion": "0.1.0",
  "serverVersion": "1.0",
  "timestamp": "2023-01-15T12:30:00Z"
}
```

#### GET `/api/sync/export`

Export all data from Desktop:

**Request:**
```http
GET /api/sync/export HTTP/1.1
Host: 192.168.1.100:30303
```

**Response:**
```json
{
  "timestamp": "2023-01-15T12:30:00Z",
  "entries": [
    {
      "id": 1,
      "syncId": "uuid-123",
      "type": "fee",
      "title": "Lunch",
      "amount": 1000,
      "entryDate": "2023-01-15",
      "categoryId": "food",
      "note": "With coworkers",
      "createdAt": "2023-01-15T12:00:00Z",
      "updatedAt": "2023-01-15T12:00:00Z"
    }
  ],
  "recurringItems": [...],
  "categories": [...],
  "categoryTargets": {...}
}
```

#### POST `/api/sync/import`

Import data to Desktop:

**Request:**
```http
POST /api/sync/import HTTP/1.1
Host: 192.168.1.100:30303
Content-Type: application/json

{
  "timestamp": "2023-01-15T12:35:00Z",
  "entries": [...],
  "recurringItems": [...],
  "categories": [...],
  "categoryTargets": {...}
}
```

**Response:**
```json
{
  "ok": true,
  "merged": {
    "entriesAdded": 5,
    "entriesUpdated": 3,
    "entriesDeleted": 0,
    "conflicts": 0
  }
}
```

---

## Client Side (Android)

### Sync Configuration

Stored in localStorage:

```javascript
localStorage.getItem("settings.syncDesktopUrl")
// "http://192.168.1.100:30303"

localStorage.getItem("settings.syncAutoEnabled")
// "1" (true) or "0" (false)
```

### Manual Sync

```javascript
async function syncNow() {
  try {
    // 1. Get desktop data
    const response = await fetch(`${desktopUrl}/api/sync/export`);
    const desktopData = await response.json();
    
    // 2. Export local data
    const localData = await ledger.sync.exportData();
    
    // 3. Merge
    const merged = mergeData(localData, desktopData);
    
    // 4. Import merged result
    await ledger.sync.importData(merged);
    
    // 5. Upload to desktop
    await fetch(`${desktopUrl}/api/sync/import`, {
      method: 'POST',
      body: JSON.stringify(merged)
    });
    
    showToast("Sync complete!");
  } catch (err) {
    showError("Sync failed: " + err.message);
  }
}
```

### Auto Sync

If enabled, sync runs on a schedule:
```javascript
if (syncAutoEnabled) {
  setInterval(syncNow, 5 * 60 * 1000); // Every 5 minutes
}
```

---

## Data Merge Algorithm

### Strategy: Last-Update-Wins

When conflicts occur, the entry with the latest `updatedAt` timestamp is kept.

```javascript
function mergeData(local, remote) {
  const merged = { entries: {} };
  
  // Start with all local entries
  for (const entry of local.entries) {
    merged.entries[entry.syncId] = entry;
  }
  
  // Update with remote entries if newer
  for (const entry of remote.entries) {
    const localEntry = merged.entries[entry.syncId];
    
    if (!localEntry || entry.updatedAt > localEntry.updatedAt) {
      // Remote is newer → use it
      merged.entries[entry.syncId] = entry;
    } else if (entry.updatedAt < localEntry.updatedAt) {
      // Local is newer → keep local
      // (no action needed)
    } else if (entry.updatedAt === localEntry.updatedAt) {
      // Same timestamp → compare amounts (or log conflict)
      if (JSON.stringify(entry) !== JSON.stringify(localEntry)) {
        console.warn("Conflict detected:", entry.syncId);
        // Keep local version
      }
    }
  }
  
  // Same for recurringItems, categories, targets
  
  return merged;
}
```

### Conflict Logging

Conflicts are logged in input_logs with action="conflict":

```sql
INSERT INTO input_logs
  (source, action, type, title, amount, target_date, category_id, note, logged_at)
VALUES
  ('sync', 'conflict', 'fee', 'Entry title', 1000, '2023-01-15', 'food', 
   'Remote: 1500, Local: 1000, Local won', datetime('now'));
```

---

## Sync Workflow

### Full Sync Cycle

```
User Clicks "Sync Now"
     ↓
[1] Desktop exports data → JSON blob
     ↓
[2] Android receives & parses JSON
     ↓
[3] Android exports local data
     ↓
[4] Merge algorithm runs
     ↓
[5] Android imports merged result
     ↓
[6] Android sends merged data back to Desktop
     ↓
[7] Desktop imports/reconciles
     ↓
[8] Show success message
```

**Time estimate:** 1-3 seconds (depending on data size)

### Sync Failure Scenarios

| Scenario | Behavior |
|----------|----------|
| Desktop offline | Show "Connection refused" error |
| Wrong IP/Port | "Cannot reach server" error |
| No Wi-Fi | "Network error" (Android network layer) |
| Old version incompatibility | "Sync format mismatch" error |
| Database locked | Retry after 1 second |

---

## Network Requirements

### Home Network Setup

For sync to work:

1. **Both devices on same Wi-Fi**
   ```
   Desktop: Connected to home Wi-Fi (192.168.1.100)
   Android: Connected to same home Wi-Fi (192.168.1.101)
   ```

2. **Port 30303 accessible**
   - Most home routers allow this by default
   - Check firewall settings if having issues
   - Port forwarding NOT needed (LAN only)

3. **Network isolation disabled**
   - Some routers isolate "guest" networks
   - If Android on guest Wi-Fi, desktop won't be reachable
   - Disable guest network or use main Wi-Fi

### Network Diagram

```
┌─────────────────────────────────────────────────┐
│  Your Home Wi-Fi Network (192.168.1.0/24)      │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────┐      ┌─────────────────┐ │
│  │  Desktop         │      │  Android        │ │
│  │  192.168.1.100   │      │  192.168.1.101  │ │
│  │  Port: 30303     │◄────►│                 │ │
│  │  (Server)        │ HTTP │  (Client)       │ │
│  └──────────────────┘      └─────────────────┘ │
│                                                 │
│  NO INTERNET REQUIRED                           │
│  (Works on offline/isolated networks)          │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Finding Your Desktop IP

### Windows

```cmd
# Command Prompt
ipconfig

# Look for IPv4 Address under "Ethernet" or "Wi-Fi"
# Example: 192.168.1.100
```

### macOS/Linux

```bash
# Terminal
ifconfig | grep "inet "

# Look for inet address on Wi-Fi interface
# Example: 192.168.1.100
```

### From HouseLedger Desktop App

1. Go to Settings
2. Find LAN Sync section
3. Your IP displayed there

---

## Troubleshooting Sync

### "Connection refused"

**Causes:**
- Desktop app not running
- Sync server not started
- Wrong IP or port

**Fix:**
1. Start HouseLedger Desktop
2. Wait 2 seconds for sync server to start
3. Verify IP in Desktop Settings
4. Retry sync

### "Cannot reach server"

**Causes:**
- Wrong Wi-Fi (different networks)
- Network firewall blocking
- Port 30303 blocked

**Fix:**
1. Both devices: Check connected Wi-Fi network (should be same)
2. Disable mobile data on Android (force Wi-Fi only)
3. Restart both apps
4. Check router firewall settings

### "Sync timeout"

**Causes:**
- Large data transfer taking too long
- Slow network connection
- Server overloaded

**Fix:**
1. Check internet connection speed
2. Reduce amount of data:
   - Delete old archived entries
   - Clean up categories
3. Try sync again

### "Conflict detected"

**Causes:**
- Both devices modified same entry simultaneously
- Clock skew between devices

**Behavior:**
- Local version is kept
- Remote version logged in history
- No data loss (check history page)

**Fix:**
- Normal behavior, review history
- If wrong version kept, manually edit
- Sync again

### "Sync data mismatch"

**Causes:**
- Different app versions
- Incompatible data format

**Fix:**
1. Update both apps to latest version
2. Retry sync

---

## Data Size Considerations

### Example Payload Sizes

| Content | Size | Notes |
|---------|------|-------|
| 100 entries | ~30 KB | Each entry ~300 bytes |
| 1000 entries | ~300 KB | Annual data |
| Categories | ~5 KB | 13 default categories |
| Full export | ~350 KB | Typical annual usage |

### Transfer Time

- **Home Wi-Fi (typical):** < 1 second
- **Slow Wi-Fi:** 1-3 seconds
- **Large dataset (5000+ entries):** 5-10 seconds

### Optimization Tips

- Archive old entries to CSV (reduces active database)
- Delete unused categories
- Limit to ~3 years of active data

---

## Security & Privacy

### Data In Transit

- HTTP (not HTTPS) for simplicity
  - ⚠️ Not secure over public networks!
  - ✅ Safe on home Wi-Fi (only local)

### Future Improvements

- [ ] HTTPS with self-signed certs
- [ ] Token-based authentication
- [ ] Encryption of data in transit

### Current Assumptions

- **Trusted network:** Only sync on personal home Wi-Fi
- **No eavesdropping:** No sensitive data on public networks
- **Integrity:** Network assumed not compromised

---

## Manual Backup Alternative

If sync isn't working, manually backup:

**Desktop:**
1. Settings → Export to CSV
2. Save file to USB/cloud

**Android:**
1. Settings → Export to CSV
2. Share to cloud storage

**Restore:**
1. Copy CSV to device
2. Settings → Import from CSV
3. Choose file and import

---

## Performance Tuning

### Reduce Sync Frequency

```javascript
// Instead of 5 minutes, use 30 minutes
setInterval(syncNow, 30 * 60 * 1000);
```

### Incremental Sync (Future)

Current: Full export → Full import  
Planned: Only sync changed entries

---

## Next Steps

- [Features](07-Features.md) — More about sync feature
- [FAQ & Troubleshooting](13-FAQ-Troubleshooting.md) — Common issues
- [Architecture](06-Architecture.md) — System design
