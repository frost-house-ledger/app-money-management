import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { createAuthGuard } from "./auth.js";
import { parseCsvText } from "./csv.js";
import { ensureLedgerSchema } from "./db/schema-input.js";
import { createLedgerStatements } from "./db/schema-input.js";
import { addMonths, compareMonths, monthEnd, monthStart, todayISO } from "./db/date-utils.js";
import { createInputLogger } from "./db/logs.js";
import { createCategoryStore, pickCategoryName } from "./db/categories.js";
import { createRecurringStore } from "./db/recurring.js";
import { createBackupService } from "./db/backup.js";
import { runStoreMigrations } from "./db/migrations.js";
import {
  ensureAmount,
  normalizeCategoryId,
  validateDate,
  validateDateRange,
  validateMonth,
  validateType
} from "./validation.js";

export function createLedgerStore(dataDir) {
  const dbPath = path.join(dataDir, "ledger.sqlite");
  const recurringJsonPath = path.join(dataDir, "recurring-items.json");
  const categoriesJsonPath = path.join(dataDir, "categories.json");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  const authGuard = createAuthGuard();
  ensureLedgerSchema(db);

  const {
    insertDailyStmt,
    insertInputLogStmt,
    rebindDailyEntriesToFoodStmt,
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
  } = createLedgerStatements(db);
  const logInput = createInputLogger(insertInputLogStmt);

  const categoryStore = createCategoryStore({
    db,
    categoriesJsonPath,
    authGuard,
    normalizeCategoryId,
    rebindDailyEntriesToFoodStmt,
    migrateDailyCategoryIdByIdStmt
  });

  const recurringStore = createRecurringStore({
    db,
    recurringJsonPath,
    authGuard,
    validateType,
    validateMonth,
    ensureAmount,
    logInput,
    rebuildMonthlyJsonCache
  });

  function createSyncId() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getMonthSummary(month, options = {}) {
    validateMonth(month);

    const monthFrom = monthStart(month);
    const monthTo = monthEnd(month);
    let from = monthFrom;
    let to = monthTo;
    const categoryId = options.categoryId ? String(options.categoryId) : null;
    const hasDateRange = Boolean(options.fromDate || options.toDate);

    if (hasDateRange) {
      validateDateRange(options.fromDate, options.toDate);
      const requestedFrom = options.fromDate || monthFrom;
      const requestedTo = options.toDate || monthTo;
      from = requestedFrom > monthFrom ? requestedFrom : monthFrom;
      to = requestedTo < monthTo ? requestedTo : monthTo;
    }

    const noDateOverlap = from > to;

    function sumDaily(type) {
      if (noDateOverlap) {
        return 0;
      }
      if (!categoryId) {
        return sumDailyByTypeStmt.get({ from, to, type }).total;
      }
      return sumDailyByTypeAndCategoryStmt.get({ from, to, type, categoryId }).total;
    }

    const recurringFee = noDateOverlap
      ? 0
      : recurringStore.sumRecurringByType(month, "fee", categoryId || null);
    const recurringIncome = categoryId || noDateOverlap ? 0 : recurringStore.sumRecurringByType(month, "income");
    const dailyFee = sumDaily("fee");
    const dailyIncome = sumDaily("income");

    const fee = recurringFee + dailyFee;
    const income = recurringIncome + dailyIncome;

    return {
      month,
      fee,
      income,
      balance: income - fee,
      recurringFee,
      recurringIncome,
      dailyFee,
      dailyIncome
    };
  }

  function getMonthRangeSummary(fromMonth, toMonth, options = {}) {
    validateMonth(fromMonth);
    validateMonth(toMonth);
    if (compareMonths(fromMonth, toMonth) > 0) {
      throw new Error("fromMonth must be less than or equal to toMonth.");
    }

    const rows = [];
    let current = fromMonth;
    while (compareMonths(current, toMonth) <= 0) {
      rows.push(getMonthSummary(current, options));
      current = addMonths(current, 1);
    }
    return rows;
  }

  function getSummaryCacheRange() {
    const recurringItems = recurringStore.listRecurringItems();
    const minRecurring = recurringItems.length > 0 ? recurringItems[0].startMonth : null;
    const minDailyDate = db.prepare("SELECT MIN(entry_date) AS date FROM daily_entries").get().date;
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const minDaily = minDailyDate ? minDailyDate.slice(0, 7) : null;
    const fromMonth = minRecurring || minDaily || currentMonth;
    const toMonth = addMonths(currentMonth, 12);

    return { fromMonth, toMonth };
  }

  function rebuildMonthlyJsonCache() {
    const { fromMonth, toMonth } = getSummaryCacheRange();
    const monthly = getMonthRangeSummary(fromMonth, toMonth);
    const jsonPath = path.join(dataDir, "monthly-summary.json");

    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          fromMonth,
          toMonth,
          monthly
        },
        null,
        2
      ),
      "utf8"
    );

    return jsonPath;
  }

  function persistDailyEntry(input, { logHistory = false, logAction = "add", logSource = "daily", logPayload = null } = {}) {
    validateType(input.type);
    validateDate(input.entryDate);
    ensureAmount(input.amount);

    const title = String(input.title || "").trim();
    if (!title) {
      throw new Error("Please enter a title.");
    }

    const categoryMap = categoryStore.getCategoryMap();
    const categoryId = input.type === "fee" ? String(input.categoryId || "food") : null;
    const currentCategory = categoryId ? categoryMap.get(categoryId) : null;

    const row = insertDailyStmt.run({
      syncId: input.syncId || createSyncId(),
      type: input.type,
      title,
      amount: input.amount,
      entryDate: input.entryDate,
      categoryId,
      category: input.type === "fee" ? pickCategoryName(currentCategory, "en") : null,
      note: input.note ? String(input.note) : null,
      createdAt: input.createdAt ? String(input.createdAt) : new Date().toISOString(),
      updatedAt: input.updatedAt ? String(input.updatedAt) : new Date().toISOString()
    });

    if (logHistory) {
      logInput({
        source: logSource,
        action: logAction,
        type: input.type,
        title,
        amount: input.amount,
        targetDate: input.entryDate,
        categoryId,
        category: input.type === "fee" ? pickCategoryName(currentCategory, "en") || "Food" : null,
        note: input.note ? String(input.note) : null,
        payload: logPayload || input
      });
    }

    return row;
  }

  function addDailyEntry(input) {
    authGuard.ensureAuthorized(input?.authToken);
    const row = persistDailyEntry(input, {
      logHistory: input.type === "fee",
      logAction: "add",
      logSource: "daily",
      logPayload: input
    });

    const cachePath = rebuildMonthlyJsonCache();
    return { id: row.lastInsertRowid, cachePath };
  }

  function importDailyCsv(input = {}) {
    authGuard.ensureAuthorized(input?.authToken);
    const records = parseCsvText(input.csvText);
    if (records.length === 0) {
      throw new Error("There are no rows to import from the CSV.");
    }

    const normalizedRows = records.map((record, index) => {
      const rowNumber = index + 2;
      const date = String(record.date || record.entrydate || record.entry_date || "").trim();
      const typeValue = String(record.type || "").trim().toLowerCase();
      const categoryName = String(record.category || "").trim();
      const title = String(record.title || "").trim();
      const description = String(record.description || record.note || "").trim();
      const priceText = String(record.price || record.amount || "").trim();

      const type = typeValue === "expense" || typeValue === "fee" ? "fee" : typeValue === "income" ? "income" : null;
      const amount = Number(String(priceText).replace(/,/g, ""));

      if (!date || !type || !title || !Number.isFinite(amount)) {
        throw new Error(`Invalid value in row ${rowNumber} of the CSV.`);
      }

      validateDate(date);
      ensureAmount(amount);

      return {
        type,
        entryDate: date,
        categoryName,
        categoryId: type === "fee" && categoryName ? normalizeCategoryId(categoryName) : null,
        title,
        note: description || null,
        amount
      };
    });

    [...new Set(normalizedRows.map((row) => row.categoryName).filter(Boolean))].forEach((categoryName) => {
      categoryStore.ensureCategoryForImport(categoryName);
    });

    const tx = db.transaction(() => {
      normalizedRows.forEach((row) => {
        persistDailyEntry(row, {
          logHistory: true,
          logAction: "add",
          logSource: "daily",
          logPayload: {
            source: "csv-import",
            row
          }
        });
      });
    });

    tx();

    const cachePath = rebuildMonthlyJsonCache();
    return { importedCount: normalizedRows.length, cachePath };
  }

  function deleteDaily(input) {
    authGuard.ensureAuthorized(input?.authToken);
    const id = Number(input.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Please specify a valid id.");
    }
    const entry = getDailyByIdStmt.get({ id });
    if (entry) {
      const categoryMap = categoryStore.getCategoryMap();
      const category = entry.categoryId ? categoryMap.get(entry.categoryId) : null;
      logInput({
        source: "daily",
        action: "delete",
        type: entry.type,
        title: entry.title,
        amount: entry.amount,
        targetDate: entry.entryDate,
        categoryId: entry.categoryId || null,
        category: pickCategoryName(category, "en") || entry.category || null,
        note: entry.note,
        payload: {
          before: {
            title: entry.title,
            amount: entry.amount,
            entryDate: entry.entryDate,
            type: entry.type,
            categoryId: entry.categoryId,
            category: pickCategoryName(category, "en") || entry.category,
            categoryIcon: category?.icon || "🍽️",
            note: entry.note
          }
        }
      });
    }
    deleteDailyStmt.run({ id });
    rebuildMonthlyJsonCache();
  }

  function updateDaily(input) {
    authGuard.ensureAuthorized(input?.authToken);
    const id = Number(input.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("Please specify a valid id.");
    }
    validateType(input.type);
    validateDate(input.entryDate);
    ensureAmount(input.amount);

    const title = String(input.title || "").trim();
    if (!title) {
      throw new Error("Please enter a title.");
    }

    const categoryMap = categoryStore.getCategoryMap();
    const oldEntry = getDailyByIdStmt.get({ id });
    const oldCategoryObj = oldEntry?.categoryId ? categoryMap.get(oldEntry.categoryId) : null;
    const currentCategory = categoryMap.get(String(input.categoryId || "food"));

    updateDailyStmt.run({
      id,
      type: input.type,
      title,
      amount: input.amount,
      entryDate: input.entryDate,
      categoryId: input.type === "fee" ? String(input.categoryId || "food") : null,
      category: input.type === "fee" ? pickCategoryName(currentCategory, "en") : null,
      note: input.note ? String(input.note) : null,
      updatedAt: new Date().toISOString()
    });

    logInput({
      source: "daily",
      action: "update",
      type: input.type,
      title,
      amount: input.amount,
      targetDate: input.entryDate,
      categoryId: input.type === "fee" ? String(input.categoryId || "food") : null,
      category: input.type === "fee" ? pickCategoryName(currentCategory, "en") : null,
      note: input.note,
      payload: {
        before: {
          title: oldEntry?.title,
          amount: oldEntry?.amount,
          entryDate: oldEntry?.entryDate,
          type: oldEntry?.type,
          categoryId: oldEntry?.categoryId,
          category: pickCategoryName(oldCategoryObj, "en") || oldEntry?.category,
          categoryIcon: oldCategoryObj?.icon || "🍽️",
          note: oldEntry?.note
        },
        after: {
          title,
          amount: input.amount,
          entryDate: input.entryDate,
          type: input.type,
          categoryId: input.type === "fee" ? String(input.categoryId || "food") : null,
          category: input.type === "fee" ? pickCategoryName(currentCategory, "en") : null,
          categoryIcon: input.type === "fee" ? (currentCategory?.icon || "🍽️") : null,
          note: input.note || null
        }
      }
    });

    const cachePath = rebuildMonthlyJsonCache();
    return { id, cachePath };
  }

  function listDaily(input = {}) {
    authGuard.ensureAuthorized(input?.authToken);
    let from = "";
    let to = "";

    if (input.fromDate || input.toDate) {
      validateDateRange(input.fromDate, input.toDate);
      from = input.fromDate || "1900-01-01";
      to = input.toDate || todayISO();
    } else {
      validateMonth(input.month);
      from = monthStart(input.month);
      to = monthEnd(input.month);
    }

    const rows = listDailyStmt.all({ from, to });
    const categoryMap = categoryStore.getCategoryMap();
    let result = rows.map((row) => {
      const category = categoryMap.get(row.categoryId) || null;
      const categoryDisplay = pickCategoryName(category, input.locale || "jp");

      return {
        ...row,
        category: categoryDisplay,
        categoryDisplay,
        categoryIcon: category?.icon || "🍽️"
      };
    });
    if (input.type === "fee" || input.type === "income") {
      result = result.filter((row) => row.type === input.type);
    }

    if (input.categoryId) {
      result = result.filter((row) => row.categoryId === input.categoryId);
    }

    return result;
  }

  function listHistory(input = {}) {
    authGuard.ensureAuthorized(input?.authToken);
    const limit = Number.isFinite(Number(input.limit)) ? Math.max(1, Number(input.limit)) : 200;
    const locale = input.locale || "jp";
    const categoryMap = categoryStore.getCategoryMap();
    const rows = listInputLogsStmt.all({ limit });

    return rows.map((row) => {
      const category = row.categoryId ? categoryMap.get(row.categoryId) : null;
      let parsedPayload = null;
      try {
        parsedPayload = row.payloadJson ? JSON.parse(row.payloadJson) : null;
      } catch {}
      return {
        ...row,
        categoryDisplay: category ? pickCategoryName(category, locale) : row.category || null,
        categoryIcon: category?.icon || "🍽️",
        before: parsedPayload?.before || null,
        after: parsedPayload?.after || null
      };
    });
  }

  function getCategoryBreakdown(input = {}) {
    authGuard.ensureAuthorized(input?.authToken);

    let from = "";
    let to = "";
    if (input.fromDate || input.toDate) {
      validateDateRange(input.fromDate, input.toDate);
      from = input.fromDate || "1900-01-01";
      to = input.toDate || todayISO();
    } else {
      validateMonth(input.month);
      from = monthStart(input.month);
      to = monthEnd(input.month);
    }

    const locale = input.locale || "jp";
    const categoryMap = categoryStore.getCategoryMap();
    const rows = sumCategoryByRangeStmt.all({ from, to });
    const totals = new Map();

    rows.forEach((row) => {
      const key = row.categoryId || "food";
      const current = totals.get(key) || 0;
      totals.set(key, current + Number(row.total || 0));
    });

    if (!input.fromDate && !input.toDate && input.month) {
      recurringStore.listRecurringItems().forEach((item) => {
        const endMonth = item.endMonth || null;
        const inRange = item.startMonth <= input.month && (!endMonth || input.month <= endMonth);
        if (item.type !== "fee" || !inRange) {
          return;
        }
        const key = String(item.categoryId || "food");
        const current = totals.get(key) || 0;
        totals.set(key, current + Number(item.amount || 0));
      });
    }

    return Array.from(totals.entries())
      .map(([categoryId, total]) => {
        const category = categoryMap.get(categoryId) || null;
        return {
          categoryId,
          total,
          categoryDisplay: pickCategoryName(category, locale),
          categoryIcon: category?.icon || "🍽️"
        };
      })
      .sort((a, b) => b.total - a.total)
      .map((row) => {
        return {
          ...row,
          total: Number(row.total || 0),
          categoryDisplay: row.categoryDisplay,
          categoryIcon: row.categoryIcon
        };
      });
  }

  function getCategoryTrend(input = {}) {
    authGuard.ensureAuthorized(input?.authToken);
    validateMonth(input.fromMonth);
    validateMonth(input.toMonth);
    if (compareMonths(input.fromMonth, input.toMonth) > 0) {
      throw new Error("fromMonth must be less than or equal to toMonth.");
    }

    const from = monthStart(input.fromMonth);
    const to = monthEnd(input.toMonth);
    const locale = input.locale || "jp";
    const categoryMap = categoryStore.getCategoryMap();
    const rows = listCategoryMonthlyTrendStmt.all({ from, to });
    const totals = new Map();

    rows.forEach((row) => {
      const key = `${row.month}::${row.categoryId || "food"}`;
      const current = totals.get(key) || 0;
      totals.set(key, current + Number(row.total || 0));
    });

    const recurringItems = recurringStore.listRecurringItems();
    let monthCursor = input.fromMonth;
    while (compareMonths(monthCursor, input.toMonth) <= 0) {
      recurringItems.forEach((item) => {
        const endMonth = item.endMonth || null;
        const inRange = item.startMonth <= monthCursor && (!endMonth || monthCursor <= endMonth);
        if (item.type !== "fee" || !inRange) {
          return;
        }
        const categoryId = String(item.categoryId || "food");
        const key = `${monthCursor}::${categoryId}`;
        const current = totals.get(key) || 0;
        totals.set(key, current + Number(item.amount || 0));
      });
      monthCursor = addMonths(monthCursor, 1);
    }

    return Array.from(totals.entries())
      .map(([compositeKey, total]) => {
        const [month, categoryId] = compositeKey.split("::");
        const category = categoryMap.get(categoryId) || null;
        return {
          month,
          categoryId,
          total: Number(total || 0),
          categoryDisplay: pickCategoryName(category, locale),
          categoryIcon: category?.icon || "🍽️"
        };
      })
      .sort((a, b) => {
        const monthCompare = a.month.localeCompare(b.month);
        if (monthCompare !== 0) {
          return monthCompare;
        }
        return b.total - a.total;
      });
  }

  function exportSyncData() {
    const dailyEntries = db
      .prepare(`
        SELECT id, sync_id AS syncId, type, title, amount, entry_date AS entryDate, category_id AS categoryId,
               category, note, created_at AS createdAt, updated_at AS updatedAt
        FROM daily_entries
        ORDER BY id ASC
      `)
      .all();

    const inputLogs = db
      .prepare(`
        SELECT id, source, action, type, title, amount, target_date AS targetDate,
               category_id AS categoryId, category, note, payload_json AS payloadJson, logged_at AS loggedAt
        FROM input_logs
        ORDER BY id ASC
      `)
      .all();

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: categoryStore.listCategories({ includeInactive: true }),
      recurring: recurringStore.listRecurringItems(),
      dailyEntries,
      inputLogs
    };
  }

  // Category targets
  async function getCategoryTargets(month) {
    if (!month) return [];
    const rows = selectCategoryTargetsByMonthStmt.all({ month });
    return rows.map((r) => ({ month: r.month, categoryId: r.categoryId, amount: Number(r.amount || 0), updatedAt: r.updatedAt }));
  }

  async function saveCategoryTargets({ month, targets = {} } = {}) {
    if (!month) throw new Error("month is required");
    const tx = db.transaction(() => {
      deleteCategoryTargetsByMonthStmt.run({ month });
      Object.entries(targets || {}).forEach(([categoryId, amount]) => {
        const num = Number(amount || 0);
        upsertCategoryTargetStmt.run({ month, categoryId, amount: num });
      });
    });
    tx();
    return { ok: true };
  }

  function importSyncData(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid sync data.");
    }

    const categories = Array.isArray(payload.categories) ? payload.categories : [];
    const recurring = Array.isArray(payload.recurring) ? payload.recurring : [];
    const dailyEntries = Array.isArray(payload.dailyEntries) ? payload.dailyEntries : [];
    const inputLogs = Array.isArray(payload.inputLogs) ? payload.inputLogs : [];

    categoryStore.replaceCategoriesForSync(categories);
    recurringStore.replaceRecurringItemsForSync(recurring);

    const insertDailyForSyncStmt = db.prepare(`
      INSERT INTO daily_entries (id, sync_id, type, title, amount, entry_date, category_id, category, note, created_at, updated_at)
      VALUES (@id, @syncId, @type, @title, @amount, @entryDate, @categoryId, @category, @note, @createdAt, @updatedAt)
    `);

    const insertLogForSyncStmt = db.prepare(`
      INSERT INTO input_logs (id, source, action, type, title, amount, target_date, category_id, category, note, payload_json, logged_at)
      VALUES (@id, @source, @action, @type, @title, @amount, @targetDate, @categoryId, @category, @note, @payloadJson, @loggedAt)
    `);

    const tx = db.transaction(() => {
      db.exec("DELETE FROM input_logs");
      db.exec("DELETE FROM daily_entries");

      dailyEntries.forEach((row, index) => {
        insertDailyForSyncStmt.run({
          // Reindex to avoid PK collisions when merging snapshots from multiple devices.
          id: index + 1,
          syncId: String(row.syncId || createSyncId()),
          type: row.type === "income" ? "income" : "fee",
          title: String(row.title || ""),
          amount: Number(row.amount || 0),
          entryDate: String(row.entryDate || ""),
          categoryId: row.type === "fee" ? String(row.categoryId || "food") : null,
          category: row.type === "fee" ? String(row.category || "Food") : null,
          note: row.note ? String(row.note) : null,
          createdAt: row.createdAt ? String(row.createdAt) : new Date().toISOString(),
          updatedAt: row.updatedAt ? String(row.updatedAt) : (row.createdAt ? String(row.createdAt) : new Date().toISOString())
        });
      });

      inputLogs.forEach((row, index) => {
        insertLogForSyncStmt.run({
          // Reindex logs for the same reason as daily_entries.
          id: index + 1,
          source: row.source === "monthly" ? "monthly" : "daily",
          action: row.action || "add",
          type: row.type === "income" ? "income" : "fee",
          title: String(row.title || ""),
          amount: Number(row.amount || 0),
          targetDate: String(row.targetDate || ""),
          categoryId: row.type === "fee" ? String(row.categoryId || "food") : null,
          category: row.type === "fee" ? String(row.category || "Food") : null,
          note: row.note ? String(row.note) : null,
          payloadJson: row.payloadJson ? String(row.payloadJson) : null,
          loggedAt: row.loggedAt ? String(row.loggedAt) : new Date().toISOString()
        });
      });
    });

    tx();
    db.exec("DELETE FROM sqlite_sequence WHERE name = 'daily_entries' OR name = 'input_logs'");
    db.prepare("UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM daily_entries) WHERE name = 'daily_entries'").run();
    db.prepare("UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM input_logs) WHERE name = 'input_logs'").run();

    const cachePath = rebuildMonthlyJsonCache();
    return {
      ok: true,
      cachePath,
      counts: {
        categories: categories.length,
        recurring: recurring.length,
        dailyEntries: dailyEntries.length,
        inputLogs: inputLogs.length
      }
    };
  }

  const { initialCachePath } = runStoreMigrations({
    categoryStore,
    recurringStore,
    rebuildMonthlyJsonCache
  });
  const backupService = createBackupService({
    authGuard,
    db,
    categoryStore,
    recurringStore,
    parseCsvText,
    importDailyCsv,
    importSyncData,
    listHistory,
    createSyncId,
    todayISO
  });

  return {
    listCategories: categoryStore.listCategories,
    addCategory: categoryStore.addCategory,
    updateCategory: categoryStore.updateCategory,
    deleteCategory: categoryStore.deleteCategory,
    reorderCategories: categoryStore.reorderCategories,
    addRecurring: recurringStore.addRecurring,
    updateRecurring: recurringStore.updateRecurring,
    deleteRecurring: recurringStore.deleteRecurring,
    addDailyEntry,
    importDailyCsv,
    deleteDaily,
    updateDaily,
    listRecurring: recurringStore.listRecurring,
    listDaily,
    listHistory,
    getCategoryBreakdown,
    getCategoryTrend,
    getMonthSummary,
    getMonthRangeSummary,
    getCategoryTargets,
    saveCategoryTargets,
    rebuildMonthlyJsonCache,
    exportBackupCsv: backupService.exportBackupCsv,
    importBackupCsv: backupService.importBackupCsv,
    exportSyncData,
    importSyncData,
    getInitialCachePath: () => initialCachePath
  };
}
