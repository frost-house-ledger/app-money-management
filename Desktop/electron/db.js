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
  } = createLedgerStatements(db);
  const logInput = createInputLogger(insertInputLogStmt);

  const categoryStore = createCategoryStore({
    db,
    categoriesJsonPath,
    authGuard,
    normalizeCategoryId,
    rebindDailyEntriesToOtherStmt,
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
      throw new Error("fromMonth は toMonth 以下にしてください。");
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
      throw new Error("title を入力してください。");
    }

    const categoryMap = categoryStore.getCategoryMap();
    const categoryId = input.type === "fee" ? String(input.categoryId || "other") : null;
    const currentCategory = categoryId ? categoryMap.get(categoryId) : null;

    const row = insertDailyStmt.run({
      type: input.type,
      title,
      amount: input.amount,
      entryDate: input.entryDate,
      categoryId,
      category: input.type === "fee" ? pickCategoryName(currentCategory, "en") : null,
      note: input.note ? String(input.note) : null
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
        category: input.type === "fee" ? pickCategoryName(currentCategory, "en") || "Other" : null,
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
      throw new Error("CSV に取り込む行がありません。");
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
        throw new Error(`CSV の ${rowNumber} 行目に不正な値があります。`);
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
      throw new Error("有効な id を指定してください。");
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
            categoryIcon: category?.icon || "🏷️",
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
      throw new Error("有効な id を指定してください。");
    }
    validateType(input.type);
    validateDate(input.entryDate);
    ensureAmount(input.amount);

    const title = String(input.title || "").trim();
    if (!title) {
      throw new Error("title を入力してください。");
    }

    const categoryMap = categoryStore.getCategoryMap();
    const oldEntry = getDailyByIdStmt.get({ id });
    const oldCategoryObj = oldEntry?.categoryId ? categoryMap.get(oldEntry.categoryId) : null;
    const currentCategory = categoryMap.get(String(input.categoryId || "other"));

    updateDailyStmt.run({
      id,
      type: input.type,
      title,
      amount: input.amount,
      entryDate: input.entryDate,
      categoryId: input.type === "fee" ? String(input.categoryId || "other") : null,
      category: input.type === "fee" ? pickCategoryName(currentCategory, "en") : null,
      note: input.note ? String(input.note) : null
    });

    logInput({
      source: "daily",
      action: "update",
      type: input.type,
      title,
      amount: input.amount,
      targetDate: input.entryDate,
      categoryId: input.type === "fee" ? String(input.categoryId || "other") : null,
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
          categoryIcon: oldCategoryObj?.icon || "🏷️",
          note: oldEntry?.note
        },
        after: {
          title,
          amount: input.amount,
          entryDate: input.entryDate,
          type: input.type,
          categoryId: input.type === "fee" ? String(input.categoryId || "other") : null,
          category: input.type === "fee" ? pickCategoryName(currentCategory, "en") : null,
          categoryIcon: input.type === "fee" ? (currentCategory?.icon || "🏷️") : null,
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
        categoryIcon: category?.icon || "🏷️"
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
        categoryIcon: category?.icon || "🏷️",
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
      const key = row.categoryId || "other";
      const current = totals.get(key) || 0;
      totals.set(key, current + Number(row.total || 0));
    });

    if (!input.fromDate && !input.toDate && input.month) {
      recurringStore.listRecurringItems().forEach((item) => {
        if (item.type !== "fee" || item.startMonth > input.month) {
          return;
        }
        const key = String(item.categoryId || "other");
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
          categoryIcon: category?.icon || "🏷️"
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
      throw new Error("fromMonth は toMonth 以下にしてください。");
    }

    const from = monthStart(input.fromMonth);
    const to = monthEnd(input.toMonth);
    const locale = input.locale || "jp";
    const categoryMap = categoryStore.getCategoryMap();
    const rows = listCategoryMonthlyTrendStmt.all({ from, to });
    const totals = new Map();

    rows.forEach((row) => {
      const key = `${row.month}::${row.categoryId || "other"}`;
      const current = totals.get(key) || 0;
      totals.set(key, current + Number(row.total || 0));
    });

    const recurringItems = recurringStore.listRecurringItems();
    let monthCursor = input.fromMonth;
    while (compareMonths(monthCursor, input.toMonth) <= 0) {
      recurringItems.forEach((item) => {
        if (item.type !== "fee" || item.startMonth > monthCursor) {
          return;
        }
        const categoryId = String(item.categoryId || "other");
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
          categoryIcon: category?.icon || "🏷️"
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

  categoryStore.ensureDefaultCategories();
  categoryStore.migrateLegacyDailyCategories();
  recurringStore.migrateRecurringItemsToJson();
  const initialCachePath = rebuildMonthlyJsonCache();

  return {
    listCategories: categoryStore.listCategories,
    addCategory: categoryStore.addCategory,
    updateCategory: categoryStore.updateCategory,
    deleteCategory: categoryStore.deleteCategory,
    reorderCategories: categoryStore.reorderCategories,
    addRecurring: recurringStore.addRecurring,
    updateRecurring: recurringStore.updateRecurring,
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
    rebuildMonthlyJsonCache,
    getInitialCachePath: () => initialCachePath
  };
}
