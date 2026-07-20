export function ensureLedgerSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_entries (
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

    CREATE TABLE IF NOT EXISTS input_logs (
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

    CREATE TABLE IF NOT EXISTS category_targets (
      month TEXT NOT NULL,
      category_id TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (month, category_id)
    );
  `);

  const dailyColumns = db.prepare("PRAGMA table_info(daily_entries)").all();
  if (!dailyColumns.some((column) => column.name === "category_id")) {
    db.exec("ALTER TABLE daily_entries ADD COLUMN category_id TEXT");
  }
  if (!dailyColumns.some((column) => column.name === "sync_id")) {
    db.exec("ALTER TABLE daily_entries ADD COLUMN sync_id TEXT");
  }
  if (!dailyColumns.some((column) => column.name === "updated_at")) {
    // SQLite disallows non-constant defaults in ALTER TABLE ADD COLUMN on some versions.
    db.exec("ALTER TABLE daily_entries ADD COLUMN updated_at TEXT");
  }
  db.exec("UPDATE daily_entries SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL OR updated_at = ''");

  // Migration: remove category column if it exists (SQLite 3.35.0+)
  if (dailyColumns.some((column) => column.name === "category")) {
    try {
      db.exec("ALTER TABLE daily_entries DROP COLUMN IF EXISTS category");
    } catch (e) {
      // Silently ignore if DROP COLUMN not supported
    }
  }

  const inputLogColumns = db.prepare("PRAGMA table_info(input_logs)").all();
  if (!inputLogColumns.some((column) => column.name === "category_id")) {
    db.exec("ALTER TABLE input_logs ADD COLUMN category_id TEXT");
  }
  if (!inputLogColumns.some((column) => column.name === "action")) {
    db.exec("ALTER TABLE input_logs ADD COLUMN action TEXT NOT NULL DEFAULT 'add'");
  }

  // Migration: remove category column from input_logs if it exists
  if (inputLogColumns.some((column) => column.name === "category")) {
    try {
      db.exec("ALTER TABLE input_logs DROP COLUMN IF EXISTS category");
    } catch (e) {
      // Silently ignore if DROP COLUMN not supported
    }
  }
}

export function createLedgerStatements(db) {
  const insertDailyStmt = db.prepare(`
    INSERT INTO daily_entries(sync_id, type, title, amount, entry_date, category_id, note, created_at, updated_at)
    VALUES (@syncId, @type, @title, @amount, @entryDate, @categoryId, @note, @createdAt, @updatedAt)
  `);

  const insertInputLogStmt = db.prepare(`
    INSERT INTO input_logs(source, action, type, title, amount, target_date, category_id, note, payload_json)
    VALUES (@source, @action, @type, @title, @amount, @targetDate, @categoryId, @note, @payloadJson)
  `);

  const rebindDailyEntriesToOtherStmt = db.prepare(`
    UPDATE daily_entries
    SET category_id = 'other'
    WHERE category_id = @id
  `);

  const migrateDailyCategoryIdByIdStmt = db.prepare(`
    UPDATE daily_entries
    SET category_id = @categoryId
    WHERE category_id IS NULL
  `);

  const listDailyStmt = db.prepare(`
    SELECT d.id,
          d.sync_id AS syncId,
           d.type,
           d.title,
           d.amount,
           d.entry_date AS entryDate,
           d.category_id AS categoryId,
           d.note,
          d.created_at AS createdAt,
          d.updated_at AS updatedAt
    FROM daily_entries d
    WHERE entry_date BETWEEN @from AND @to
    ORDER BY d.entry_date DESC, d.created_at DESC
  `);

  const sumDailyByTypeStmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM daily_entries
    WHERE entry_date BETWEEN @from AND @to
      AND type = @type
  `);

  const sumDailyByTypeAndCategoryStmt = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM daily_entries
    WHERE entry_date BETWEEN @from AND @to
      AND type = @type
        AND category_id = @categoryId
  `);

  const listInputLogsStmt = db.prepare(`
    SELECT id,
           source,
           action,
           type,
           title,
           amount,
           target_date AS targetDate,
           category_id AS categoryId,
           note,
           payload_json AS payloadJson,
           logged_at AS loggedAt
    FROM input_logs
    ORDER BY logged_at DESC, id DESC
    LIMIT @limit
  `);

  const sumCategoryByRangeStmt = db.prepare(`
    SELECT category_id AS categoryId,
           COALESCE(SUM(amount), 0) AS total
    FROM daily_entries
    WHERE type = 'fee'
      AND entry_date BETWEEN @from AND @to
    GROUP BY category_id
    ORDER BY total DESC
  `);

  const listCategoryMonthlyTrendStmt = db.prepare(`
    SELECT substr(entry_date, 1, 7) AS month,
           category_id AS categoryId,
           COALESCE(SUM(amount), 0) AS total
    FROM daily_entries
    WHERE type = 'fee'
      AND entry_date BETWEEN @from AND @to
    GROUP BY month, category_id
    ORDER BY month ASC
  `);

  const selectCategoryTargetsByMonthStmt = db.prepare(`
    SELECT month, category_id AS categoryId, amount, updated_at AS updatedAt
    FROM category_targets
    WHERE month = @month
  `);

  const upsertCategoryTargetStmt = db.prepare(`
    INSERT INTO category_targets(month, category_id, amount, updated_at)
    VALUES (@month, @categoryId, @amount, CURRENT_TIMESTAMP)
    ON CONFLICT(month, category_id) DO UPDATE SET amount = excluded.amount, updated_at = excluded.updated_at
  `);

  const deleteCategoryTargetsByMonthStmt = db.prepare(`
    DELETE FROM category_targets WHERE month = @month
  `);

  const deleteDailyStmt = db.prepare(`
    DELETE FROM daily_entries WHERE id = @id
  `);

  const getDailyByIdStmt = db.prepare(`
    SELECT id, type, title, amount, entry_date AS entryDate,
          category_id AS categoryId, note, sync_id AS syncId,
          created_at AS createdAt, updated_at AS updatedAt
    FROM daily_entries WHERE id = @id
  `);

  const updateDailyStmt = db.prepare(`
    UPDATE daily_entries
    SET type = @type,
        title = @title,
        amount = @amount,
        entry_date = @entryDate,
        category_id = @categoryId,
        note = @note,
        updated_at = @updatedAt
    WHERE id = @id
  `);

  return {
    insertDailyStmt,
    insertInputLogStmt,
    rebindDailyEntriesToOtherStmt,
    migrateDailyCategoryIdByIdStmt,
    listDailyStmt,
    sumDailyByTypeStmt,
    sumDailyByTypeAndCategoryStmt,
    listInputLogsStmt,
    sumCategoryByRangeStmt,
    listCategoryMonthlyTrendStmt,
    selectCategoryTargetsByMonthStmt,
    upsertCategoryTargetStmt,
    deleteCategoryTargetsByMonthStmt,
    deleteDailyStmt,
    getDailyByIdStmt,
    updateDailyStmt
  };
}
