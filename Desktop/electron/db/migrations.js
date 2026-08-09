export function runStoreMigrations({
  categoryStore,
  recurringStore,
  rebuildMonthlyJsonCache,
  db
}) {
  // Migration: Add 'investment' type to CHECK constraints
  migrateAddInvestmentType(db);
  
  categoryStore.ensureDefaultCategories();
  categoryStore.migrateLegacyDailyCategories();
  recurringStore.migrateRecurringItemsToJson();

  return {
    initialCachePath: rebuildMonthlyJsonCache()
  };
}

function migrateAddInvestmentType(db) {
  try {
    // Check if daily_entries table exists
    const dailyTableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'daily_entries'")
      .get();

    if (dailyTableExists) {
      // Try to insert a test row with 'investment' type to see if constraint fails
      const testStmt = db.prepare("SELECT 1 WHERE 0");
      try {
        db.prepare("INSERT INTO daily_entries (type, title, amount, entry_date) VALUES ('investment', 'test', 0, '2000-01-01')").run();
        db.prepare("DELETE FROM daily_entries WHERE title = 'test'").run();
      } catch (error) {
        if (error.message.includes("CHECK constraint failed")) {
          // Constraint needs updating - recreate table
          recreateDailyEntriesTable(db);
        }
      }
    }

    // Check if input_logs table exists
    const logsTableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'input_logs'")
      .get();

    if (logsTableExists) {
      try {
        db.prepare("INSERT INTO input_logs (source, type, title, amount, target_date) VALUES ('daily', 'investment', 'test', 0, '2000-01-01')").run();
        db.prepare("DELETE FROM input_logs WHERE title = 'test'").run();
      } catch (error) {
        if (error.message.includes("CHECK constraint failed")) {
          // Constraint needs updating - recreate table
          recreateInputLogsTable(db);
        }
      }
    }
  } catch (error) {
    console.error("Migration error:", error);
  }
}

function recreateDailyEntriesTable(db) {
  db.exec(`
    ALTER TABLE daily_entries RENAME TO daily_entries_old;
    
    CREATE TABLE daily_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('fee','income','investment')),
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount >= 0),
      entry_date TEXT NOT NULL,
      category_id TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    
    INSERT INTO daily_entries (id, sync_id, type, title, amount, entry_date, category_id, note, created_at, updated_at)
    SELECT id, sync_id, type, title, amount, entry_date, category_id, note, created_at, updated_at
    FROM daily_entries_old;
    
    DROP TABLE daily_entries_old;
  `);
}

function recreateInputLogsTable(db) {
  db.exec(`
    ALTER TABLE input_logs RENAME TO input_logs_old;
    
    CREATE TABLE input_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL CHECK(source IN ('monthly','daily')),
      action TEXT NOT NULL DEFAULT 'add',
      type TEXT NOT NULL CHECK(type IN ('fee','income','investment')),
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      target_date TEXT NOT NULL,
      category_id TEXT,
      note TEXT,
      payload_json TEXT,
      logged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    
    INSERT INTO input_logs (id, source, action, type, title, amount, target_date, category_id, note, payload_json, logged_at)
    SELECT id, source, action, type, title, amount, target_date, category_id, note, payload_json, logged_at
    FROM input_logs_old;
    
    DROP TABLE input_logs_old;
  `);
}
