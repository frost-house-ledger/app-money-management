export function ensureLedgerSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('fee','income')),
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount >= 0),
      entry_date TEXT NOT NULL,
      category_id TEXT,
      category TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS input_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL CHECK(source IN ('monthly','daily')),
      action TEXT NOT NULL DEFAULT 'add',
      type TEXT NOT NULL CHECK(type IN ('fee','income')),
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      target_date TEXT NOT NULL,
      category_id TEXT,
      category TEXT,
      note TEXT,
      payload_json TEXT,
      logged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const dailyColumns = db.prepare("PRAGMA table_info(daily_entries)").all();
  if (!dailyColumns.some((column) => column.name === "category")) {
    db.exec("ALTER TABLE daily_entries ADD COLUMN category TEXT");
  }
  if (!dailyColumns.some((column) => column.name === "category_id")) {
    db.exec("ALTER TABLE daily_entries ADD COLUMN category_id TEXT");
  }

  const inputLogColumns = db.prepare("PRAGMA table_info(input_logs)").all();
  if (!inputLogColumns.some((column) => column.name === "category_id")) {
    db.exec("ALTER TABLE input_logs ADD COLUMN category_id TEXT");
  }
  if (!inputLogColumns.some((column) => column.name === "action")) {
    db.exec("ALTER TABLE input_logs ADD COLUMN action TEXT NOT NULL DEFAULT 'add'");
  }
}

export function createLedgerStatements(db) {
  const insertDailyStmt = db.prepare(`
    INSERT INTO daily_entries(type, title, amount, entry_date, category_id, category, note)
    VALUES (@type, @title, @amount, @entryDate, @categoryId, @category, @note)
  `);

  const insertInputLogStmt = db.prepare(`
    INSERT INTO input_logs(source, action, type, title, amount, target_date, category_id, category, note, payload_json)
    VALUES (@source, @action, @type, @title, @amount, @targetDate, @categoryId, @category, @note, @payloadJson)
  `);

  const rebindDailyEntriesToOtherStmt = db.prepare(`
    UPDATE daily_entries
    SET category_id = 'other', category = 'Other'
    WHERE category_id = @id
  `);

  const migrateDailyCategoryIdByIdStmt = db.prepare(`
    UPDATE daily_entries
    SET category_id = @categoryId
    WHERE category_id IS NULL
      AND category = @legacyName
  `);

  const listDailyStmt = db.prepare(`
    SELECT d.id,
           d.type,
           d.title,
           d.amount,
           d.entry_date AS entryDate,
           d.category_id AS categoryId,
           d.category AS categoryLegacy,
           d.note,
           d.created_at AS createdAt
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
           category,
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

  const deleteDailyStmt = db.prepare(`
    DELETE FROM daily_entries WHERE id = @id
  `);

  const getDailyByIdStmt = db.prepare(`
    SELECT id, type, title, amount, entry_date AS entryDate,
           category_id AS categoryId, category, note
    FROM daily_entries WHERE id = @id
  `);

  const updateDailyStmt = db.prepare(`
    UPDATE daily_entries
    SET type = @type,
        title = @title,
        amount = @amount,
        entry_date = @entryDate,
        category_id = @categoryId,
        category = @category,
        note = @note
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
    deleteDailyStmt,
    getDailyByIdStmt,
    updateDailyStmt
  };
}
