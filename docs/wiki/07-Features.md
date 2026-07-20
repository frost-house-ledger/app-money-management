# Features

Comprehensive guide to HouseLedger's features.

## Daily Entry — Core Transaction Recording

### Overview

Daily entries are the primary way to record expenses and income.

### Features

✅ **Quick Entry** — Title, amount, category, date, optional note  
✅ **Type Selection** — Expense (fee) or Income  
✅ **Category Assignment** — Pre-defined or custom categories  
✅ **Date Flexibility** — Enter past/future dates  
✅ **Bulk Management** — Edit, delete, duplicate entries  
✅ **Search & Filter** — Filter by category, date range  

### Workflow

1. **Enter Daily Entry**
   - Type: Select "Expense" or "Income"
   - Category: Choose from list (🍽️ Food, 🚌 Transport, etc.)
   - Title: "Lunch at restaurant"
   - Amount: 1500 (in base currency)
   - Date: Auto-filled with today (editable)
   - Note: Optional details

2. **Save**
   - Entry added to ledger
   - Creates input log for audit trail
   - Updates monthly summary cache

3. **Edit**
   - Click entry row → Full editor opens
   - Modify any field
   - Save changes (updates modified timestamp)

4. **Delete**
   - Confirm deletion
   - Entry removed + logged

### Multi-Currency Support

When you add an entry:
- Always entered in **base currency** (settings → currency)
- Display converts to selected currency using exchange rates
- Stored in base amount in database
- Exchange rates updated daily (or manually)

---

## Monthly/Recurring Items

### Purpose

For regular transactions that repeat every month:
- Salary deposits
- Rent payments
- Subscription fees
- Utility bills

### Create Recurring Item

| Field | Description |
|-------|-------------|
| Type | "Fee" (expense) or "Income" (salary) |
| Frequency | "Monthly" (always monthly) |
| Category | Category for grouping |
| Title | "Monthly Subscription" |
| Amount | 500 JPY |
| Start Month | "2024-01" |
| End Month | "2024-12" (or leave empty for ongoing) |
| Note | Optional details |

### Automatic Calculation

Recurring items are **added to monthly summaries**:
```
Monthly Total = Daily Entries + Recurring Items
```

Example:
- Daily expenses: 50,000 JPY
- Recurring (salary): +300,000 JPY
- Recurring (rent): -100,000 JPY
- **Monthly Balance: +150,000 JPY**

### Edit/Delete

- Click recurring item in monthly view
- Modify or delete
- Changes apply to all future months (or specific range if edited)

---

## Category Management

### Default Categories

HouseLedger comes with 13 categories:

| Icon | Name | Purpose |
|------|------|---------|
| 🍽️ | Food | Groceries, restaurants |
| ☕ | Beverage | Drinks, coffee |
| 🚌 | Transport | Bus, taxi, fuel |
| 🏠 | Housing | Rent, mortgage |
| 💡 | Utilities | Water, electric, gas |
| 💊 | Medical | Doctor, medicine |
| 📚 | Education | Courses, books |
| 🎬 | Entertainment | Movies, hobbies |
| ✈️ | Travel | Flights, hotels |
| 🛍️ | Shopping | Clothes, gifts |
| 🔁 | Subscription | Services, apps |
| ⚕️ | Insurance | Health, auto |
| 📦 | Other | Miscellaneous |

### Custom Categories

- **Create** — Add name, icon, display order
- **Edit** — Modify name/icon
- **Delete** — Reassign entries to another category
- **Reorder** — Drag to sort in lists
- **Active/Inactive** — Hide unused categories

### Category Icons

- Use emoji (🍽️, 🚌, etc.)
- Or text (FOOD, TRANS, etc.)
- Icon appears in lists and charts

---

## History & Audit Trail

### Purpose

Track all changes to entries for verification and debugging.

### Information Logged

| Field | Value |
|-------|-------|
| Source | "daily" or "monthly" |
| Action | "add", "update", or "delete" |
| Type | "fee" or "income" |
| Title | Entry title |
| Amount | Transaction amount |
| Target Date | Date of entry |
| Category | Category ID |
| Logged At | Timestamp |

### View History

1. Go to "History" page
2. Select month/date range
3. See all modifications with timestamps
4. Trace changes back to original entry

### Use Cases

- Verify past entries
- Audit trail for accounting
- Undo mistakes (manual re-entry)
- Detect sync conflicts

---

## Category Analysis

### Breakdown Table

Shows how much was spent in each category:

| Category | Amount | % of Total |
|----------|--------|-----------|
| Food | 50,000 | 25% |
| Transport | 15,000 | 7.5% |
| Housing | 80,000 | 40% |
| Other | 55,000 | 27.5% |

### Monthly Trends (Chart)

Bar chart showing category spending over 12 months:
- X-axis: Months (Jan, Feb, Mar, ...)
- Y-axis: Amount (stacked)
- Colors: Each category has different color
- Hover: Show exact amount

### Target Budget Setting

Set monthly budget limits per category:

1. Click "Set Budget Target"
2. Enter target amount for each category
3. Save

Then in analysis:
- If actual < target → Normal display
- If actual > target → Shown in red as warning

---

## Annual Statistics

### Summary Table

Yearly financial overview:

| Metric | Value |
|--------|-------|
| Total Income | 3,600,000 JPY |
| Total Expenses | 2,400,000 JPY |
| Net Savings | 1,200,000 JPY |
| Savings Rate | 33% |

Broken down by:
- Month
- Category
- Income vs. Expense

### Savings Simulation

"What if" calculator:
- **Input:** Monthly savings amount
- **Output:** Projected savings in 1/5/10/20 years
- **Scenarios:** Compare different savings rates

Example:
```
If I save 100,000 JPY/month:
- 1 year:  1,200,000 JPY
- 5 years: 6,000,000 JPY
- 10 years: 12,000,000 JPY
```

---

## Settings

### Display Settings

**Currency**
- Select from 100+ currencies
- All amounts display in selected currency
- Exchange rates applied automatically

**Language**
- English, 日本語, Deutsch, Español, Português, Italiano, Français, Русский, 繁體中文, 한국어, العربية
- UI updates immediately
- Category names translated

### Data Settings

**LAN Sync**
- Desktop IP: `192.168.1.100:30303`
- Enable auto-sync or manual sync
- Sync frequency (if auto)

**Import/Export**
- Export to CSV
- Import from CSV (with category mapping)

### About

- App version
- Database size
- Data folder location
- Check for updates

---

## LAN Sync (Desktop ↔ Android)

### What Syncs?

✅ Daily entries  
✅ Recurring items  
✅ Categories  
✅ Budget targets  
✅ Exchange rates  

### How to Set Up

**Desktop:**
1. Start HouseLedger (sync server starts automatically on port 30303)
2. Note your IP address: Settings → LAN Sync
3. Keep HouseLedger running

**Android:**
1. Open Settings
2. LAN Sync → Desktop Server URL
3. Enter: `http://192.168.1.100:30303` (replace with your desktop IP)
4. Tap "Test Connection"
5. Enable "Auto-sync" (optional)

### Sync Workflow

```
Press Sync Now
     ↓
Export local data
     ↓
Send to Desktop
     ↓
Receive Desktop data
     ↓
Merge (latest timestamp wins)
     ↓
Save merged result
     ↓
Done!
```

### Conflict Resolution

When syncing, if both devices modified same entry:
- **Last update wins** — Entry with latest `updatedAt` is kept
- **No data loss** — Older version is logged in history
- **Manual review** — Check history for conflicts

### Network Requirements

- Both devices on **same Wi-Fi network**
- Desktop IP accessible from Android
- Port 30303 open (usually automatic on home networks)
- Internet NOT required

---

## Exchange Rates

### Currencies Supported

100+ currencies including:
- JPY (¥), USD ($), EUR (€), GBP (£), CNY (¥), KRW (₩)
- And many more regional currencies

### Rate Sources

- Updated daily from external sources
- Manual override available
- Last update timestamp shown

### Display Conversion

Amount in **base currency** → Display in **selected currency**

Example:
- Entry: 1000 JPY
- Base: JPY
- Display: USD → 6.70 USD (using current rate)

---

## Localization

### Supported Languages

| Code | Language | Direction |
|------|----------|-----------|
| en | English | LTR |
| ja | 日本語 | LTR |
| de | Deutsch | LTR |
| es | Español | LTR |
| pt | Português | LTR |
| it | Italiano | LTR |
| fr | Français | LTR |
| ru | Русский | LTR |
| tw | 繁體中文 | LTR |
| ko | 한국어 | LTR |
| ar | العربية | RTL |

### What Gets Translated?

✅ UI strings (buttons, labels, headings)  
✅ Category names  
✅ Month/date formatting  
✅ Number formatting (1,000.00 vs 1.000,00)  
✅ Error messages  

### Locale-Aware Formatting

Formats adapt to selected language:
- Dates: 2023-01-15 (en) vs 2023年1月15日 (ja)
- Numbers: 1,234.56 (en) vs 1.234,56 (de)
- Currencies: $1,000 (USD) vs ¥1,000 (JPY)

---

## Privacy & Data

### What's Stored Locally?

✅ All financial data (entries, categories, targets)  
✅ User preferences (currency, language, sync settings)  
✅ Exchange rates cache  

### What's NOT Sent to Servers?

❌ Ledger entries (NEVER uploaded)  
❌ Personal data (names, amounts)  
❌ Categories or transactions  
❌ Sync data (unless explicitly syncing to another device)  
❌ Telemetry or usage analytics  

### Backup Your Data

Recommended backup strategy:
1. Regular exports to CSV
2. Copy database file to external drive
3. Use OS-level encryption (BitLocker, FileVault)
4. Cloud sync to private storage (Dropbox, OneDrive with encryption)

---

## Roadmap

Coming soon:
- 🔐 Encrypted backup & export
- 💱 Live exchange-rate auto-refresh
- 📊 More chart types (line, scatter)
- 🏷️ Tags for flexible categorization
- 🔔 Budget alerts & notifications
- 📱 Improved Android UI
- 📈 Investment tracking
- 💰 Loan/debt management

---

## Need Help?

- See [FAQ & Troubleshooting](13-FAQ-Troubleshooting.md)
- Check [LAN Sync Deep Dive](08-LAN-Sync-Deep-Dive.md) for sync issues
- File an issue on [GitHub](https://github.com/frost-house-ledger/app-money-management/issues)
