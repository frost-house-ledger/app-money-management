# Data Backup and Restore

HouseLedger stores finance data locally by default. Backups are the user's responsibility, especially before upgrading, migrating to another device, or enabling LAN synchronisation.

## Stored data

### Desktop

Electron stores application data in its `userData` directory. The exact path is provided by Electron and varies by operating system:

- Windows: `%APPDATA%/HouseLedger` or `%LOCALAPPDATA%/HouseLedger`
- macOS: `~/Library/Application Support/HouseLedger`
- Linux: `~/.config/HouseLedger`

The main files are:

| File | Contents |
| --- | --- |
| `ledger.sqlite` | Daily entries, history, and other relational data |
| `recurring-items.json` | Monthly recurring entries |
| `categories.json` | User category definitions and ordering |

### Android

The Android build uses Capacitor SQLite. The database is stored in the application's private storage and is not directly accessible as a normal user file. Use CSV export or LAN synchronisation to move data from Android.

## CSV backup

CSV export is the recommended user-facing backup method because it can be stored outside the application directory and inspected before restoration.

The application supports these scopes:

- `daily`: daily entries only
- `monthly`: recurring entries only
- `all`: daily entries and recurring entries

Exported files use the pattern `amm-<scope>-backup-YYYY-MM-DD.csv`.

Keep exported files in a secure location. CSV files are not encrypted and may contain amounts, titles, notes, and category information.

## Restore from CSV

1. Export a fresh backup from the current installation before importing anything.
2. Confirm that the CSV was created by HouseLedger and contains the expected columns.
3. Import the CSV from the application import action.
4. Review the daily and monthly screens after import.
5. Check a few totals and categories against the original backup.

Do not open and resave the file in a spreadsheet application if possible. Spreadsheet software may change dates, numeric precision, or encoding.

## Direct Desktop backup

For a complete Desktop backup, close HouseLedger first and copy the entire `userData` directory to a secure location. Copying an open SQLite database can produce an inconsistent backup because SQLite uses WAL journalling.

Restore a direct backup only while HouseLedger is closed. Preserve the directory structure and make a separate copy of the current directory before replacing it.

## LAN synchronisation

LAN synchronisation is a device-to-device transfer mechanism, not a backup replacement. It runs on port `30303` while the Desktop application is open and is intended for devices on the same trusted local network.

Create an independent CSV or Desktop backup before synchronising. A sync mistake or an unwanted overwrite can otherwise affect both devices.

## Security

- Treat CSV files and copied application directories as sensitive financial records.
- Do not upload unencrypted backups to public repositories or shared storage.
- Use operating-system disk encryption and access controls where available.
- Encrypted backup and end-to-end encrypted synchronisation are not currently provided.