/**
 * Android / Capacitor adapter.
 * Uses @capacitor-community/sqlite for persistent storage and localStorage for
 * JSON-based stores (categories, recurring items).
 *
 * Database schema mirrors Desktop/electron/db/schema-input.js.
 */
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_NAME = "ledger";
const LS_CATEGORIES = "android.categories";
const LS_RECURRING = "android.recurring";

const DEFAULT_CATEGORIES = [
  { id: "food",          nameJp: "食費",      nameEn: "Food",          nameDe: "Essen",          icon: "🍽️",  sortOrder: 10,  isActive: 1 },
  { id: "transport",     nameJp: "交通",      nameEn: "Transport",     nameDe: "Verkehr",         icon: "🚌",  sortOrder: 20,  isActive: 1 },
  { id: "housing",       nameJp: "住居",      nameEn: "Housing",       nameDe: "Wohnen",          icon: "🏠",  sortOrder: 30,  isActive: 1 },
  { id: "utilities",     nameJp: "光熱費",    nameEn: "Utilities",     nameDe: "Nebenkosten",     icon: "💡",  sortOrder: 40,  isActive: 1 },
  { id: "medical",       nameJp: "医療",      nameEn: "Medical",       nameDe: "Medizin",         icon: "💊",  sortOrder: 50,  isActive: 1 },
  { id: "education",     nameJp: "教育",      nameEn: "Education",     nameDe: "Bildung",         icon: "📚",  sortOrder: 60,  isActive: 1 },
  { id: "entertainment", nameJp: "娯楽",      nameEn: "Entertainment", nameDe: "Unterhaltung",    icon: "🎬",  sortOrder: 70,  isActive: 1 },
  { id: "shopping",      nameJp: "買い物",    nameEn: "Shopping",      nameDe: "Einkauf",         icon: "🛍️", sortOrder: 80,  isActive: 1 },
  { id: "subscription",  nameJp: "サブスク",  nameEn: "Subscription",  nameDe: "Abo",             icon: "🔁",  sortOrder: 90,  isActive: 1 },
  { id: "other",         nameJp: "その他",    nameEn: "Other",         nameDe: "Sonstiges",       icon: "📦",  sortOrder: 100, isActive: 1 }
];

// ─── DB initialisation ────────────────────────────────────────────────────────

let _db = null;
let _sqlite = null;

async function getDb() {
  if (_db) return _db;
  _sqlite = new SQLiteConnection(CapacitorSQLite);
  const ret = await _sqlite.checkConnectionsConsistency();
  const isConn = (await _sqlite.isConnection(DB_NAME, false)).result;

  if (ret.result && isConn) {
    _db = await _sqlite.retrieveConnection(DB_NAME, false);
  } else {
    _db = await _sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
  }

  await _db.open();
  await _db.execute(`
    CREATE TABLE IF NOT EXISTS daily_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('fee','income')),
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount >= 0),
      entry_date TEXT NOT NULL,
      category_id TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      note TEXT,
      logged_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return _db;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart(yyyymm) {
  return `${yyyymm}-01`;
}

function monthEnd(yyyymm) {
  const [y, m] = yyyymm.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${yyyymm}-${String(last).padStart(2, "0")}`;
}

function validateMonthValue(month, fieldName) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) {
    throw new Error(`${fieldName} must be YYYY-MM`);
  }
}

function validateRecurringMonthRange(startMonth, endMonth) {
  validateMonthValue(startMonth, "startMonth");
  if (!endMonth) {
    return;
  }
  validateMonthValue(endMonth, "endMonth");
  if (String(startMonth) > String(endMonth)) {
    throw new Error("startMonth must be <= endMonth");
  }
}

// ─── Category store (localStorage) ───────────────────────────────────────────

function readCategories() {
  try {
    const raw = localStorage.getItem(LS_CATEGORIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.items) ? parsed.items : DEFAULT_CATEGORIES;
    }
  } catch {}
  return DEFAULT_CATEGORIES.map((c) => ({ ...c }));
}

function writeCategories(items) {
  localStorage.setItem(LS_CATEGORIES, JSON.stringify({ updatedAt: new Date().toISOString(), items }));
}

function normalizeCategoryId(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

function pickCategoryLabel(category, locale) {
  if (!category) {
    return locale === "de" ? "Sonstiges" : locale === "en" ? "Other" : "その他";
  }
  if (locale === "de") {
    return category.nameDe || category.nameEn || category.nameJp || category.id;
  }
  if (locale === "en") {
    return category.nameEn || category.nameJp || category.nameDe || category.id;
  }
  return category.nameJp || category.nameEn || category.nameDe || category.id;
}

// ─── Recurring store (localStorage) ──────────────────────────────────────────

function readRecurring() {
  try {
    const raw = localStorage.getItem(LS_RECURRING);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.items) ? parsed.items : [];
    }
  } catch {}
  return [];
}

function writeRecurring(items) {
  localStorage.setItem(LS_RECURRING, JSON.stringify({ updatedAt: new Date().toISOString(), items }));
}

function sumRecurringByType(month, type, categoryId = null) {
  return readRecurring()
    .filter((item) => {
      const endMonth = item.endMonth || null;
      const inRange = item.startMonth <= month && (!endMonth || month <= endMonth);
      if (!(item.type === type && inRange)) {
        return false;
      }
      if (type !== "fee") {
        return true;
      }
      if (!categoryId) {
        return true;
      }
      return String(item.categoryId || "other") === String(categoryId);
    })
    .reduce((total, item) => total + Number(item.amount || 0), 0);
}

// ─── CSV parser (mirrors Desktop/electron/csv.js) ────────────────────────────

function parseCsvText(csvText) {
  let text = csvText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");
  if (!lines.length) return [];

  function parseRow(line) {
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let field = "";
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { field += line[i++]; }
        }
        fields.push(field);
        if (line[i] === ",") i++;
      } else {
        const end = line.indexOf(",", i);
        if (end === -1) { fields.push(line.slice(i)); i = line.length; }
        else { fields.push(line.slice(i, end)); i = end + 1; }
      }
    }
    return fields;
  }

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase().trim());
  const rows = [];
  for (let r = 1; r < lines.length; r++) {
    const line = lines[r].trim();
    if (!line) continue;
    const fields = parseRow(lines[r]);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = fields[i] ?? ""; });
    rows.push(obj);
  }
  return rows;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function createAndroidApi() {
  return {
    // ── Entry ──────────────────────────────────────────────────────────────

    entry: {
      async add(input) {
        const db = await getDb();
        const type = input.type === "income" ? "income" : "fee";
        const entryDate = input.entryDate || todayISO();
        const amount = Number(input.amount ?? 0);
        const categoryId = type === "fee" ? (input.categoryId || "other") : null;

        const res = await db.run(
          `INSERT INTO daily_entries(type, title, amount, entry_date, category_id, note)
           VALUES (?,?,?,?,?,?)`,
          [type, String(input.title || "").trim(), amount, entryDate, categoryId, input.note || ""]
        );

        if (type === "fee") {
          await db.run(
            `INSERT INTO input_logs(source, action, type, title, amount, target_date, category_id, note)
             VALUES ('daily','add',?,?,?,?,?,?)`,
            [type, String(input.title || "").trim(), amount, entryDate, categoryId, input.note || ""]
          );
        }
        return { id: res.changes?.lastId };
      },

      async update(input) {
        const db = await getDb();
        const type = input.type === "income" ? "income" : "fee";
        const categoryId = type === "fee" ? (input.categoryId || "other") : null;
        await db.run(
          `UPDATE daily_entries SET type=?, title=?, amount=?, entry_date=?, category_id=?, note=? WHERE id=?`,
          [type, String(input.title || "").trim(), Number(input.amount ?? 0),
           input.entryDate || todayISO(), categoryId, input.note || "", input.id]
        );
        return { id: input.id };
      },

      async delete({ id }) {
        const db = await getDb();
        await db.run("DELETE FROM daily_entries WHERE id=?", [id]);
        return { id };
      },

      async list({ month, filterType, categoryId, fromDate, toDate } = {}) {
        const db = await getDb();
        const conditions = [];
        const params = [];

        if (month) {
          const from = fromDate && fromDate > monthStart(month) ? fromDate : monthStart(month);
          const to   = toDate   && toDate   < monthEnd(month)   ? toDate   : monthEnd(month);
          conditions.push("entry_date >= ?", "entry_date <= ?");
          params.push(from, to);
        }
        if (filterType && filterType !== "all") {
          conditions.push("type = ?");
          params.push(filterType);
        }
        if (categoryId && categoryId !== "all") {
          conditions.push("category_id = ?");
          params.push(categoryId);
        }

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const res = await db.query(
          `SELECT id, type, title, amount, entry_date AS entryDate, category_id AS categoryId, note, created_at AS createdAt
           FROM daily_entries ${where} ORDER BY entry_date DESC, id DESC`,
          params
        );
        return res.values || [];
      },

      async importCsv({ csvText }) {
        if (!csvText) throw new Error("CSV text is required");
        const rows = parseCsvText(csvText);
        if (!rows.length) return { importedCount: 0 };

        const db = await getDb();
        let importedCount = 0;
        const categories = readCategories();
        const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const entryDate = String(row.date || "").trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) throw new Error(`Row ${i + 1}: invalid date "${entryDate}"`);

          const rawType = String(row.type || "").toLowerCase().trim();
          const type = rawType === "income" ? "income" : "fee";
          const title = String(row.title || "").trim();
          if (!title) throw new Error(`Row ${i + 1}: title is required`);

          const amount = Number((row.price || row.amount || "0").replace(/,/g, ""));
          if (!Number.isFinite(amount) || amount < 0) throw new Error(`Row ${i + 1}: invalid amount`);

          const categoryName = String(row.category || "other").trim();
          let categoryId = normalizeCategoryId(categoryName) || "other";
          if (!catMap[categoryId]) {
            const newCat = {
              id: categoryId, nameJp: categoryName, nameEn: categoryName, nameDe: categoryName,
              icon: "🏷️", sortOrder: (categories.length + 1) * 10, isActive: 1
            };
            categories.push(newCat);
            catMap[categoryId] = newCat;
          }

          await db.run(
            `INSERT INTO daily_entries(type, title, amount, entry_date, category_id, note)
             VALUES (?,?,?,?,?,?)`,
            [type, title, amount, entryDate, type === "fee" ? categoryId : null, row.description || row.note || ""]
          );
          importedCount++;
        }

        writeCategories(categories);
        return { importedCount };
      }
    },

    // ── Category ───────────────────────────────────────────────────────────

    category: {
      async list() {
        return readCategories();
      },
      async add(input) {
        const categories = readCategories();
        const id = normalizeCategoryId(input.nameJp || input.nameEn || input.id) || `cat-${Date.now()}`;
        if (categories.find((c) => c.id === id)) throw new Error("Category ID already exists");
        const maxSort = categories.reduce((m, c) => Math.max(m, c.sortOrder || 0), 0);
        const newCat = {
          id,
          nameJp: String(input.nameJp || "").trim(),
          nameEn: String(input.nameEn || "").trim(),
          nameDe: String(input.nameDe || "").trim(),
          icon: String(input.icon || "📦").trim(),
          sortOrder: maxSort + 10,
          isActive: 1
        };
        categories.push(newCat);
        writeCategories(categories);
        return newCat;
      },
      async update(input) {
        const categories = readCategories();
        const idx = categories.findIndex((c) => c.id === input.id);
        if (idx === -1) throw new Error("Category not found");
        categories[idx] = { ...categories[idx], ...input };
        writeCategories(categories);
        return categories[idx];
      },
      async delete({ id }) {
        let categories = readCategories();
        categories = categories.filter((c) => c.id !== id);
        writeCategories(categories);
        const db = await getDb();
        await db.run("UPDATE daily_entries SET category_id='other' WHERE category_id=?", [id]);
        return { id };
      },
      async reorder({ ids }) {
        const categories = readCategories();
        const sorted = ids
          .map((id, i) => {
            const cat = categories.find((c) => c.id === id);
            return cat ? { ...cat, sortOrder: (i + 1) * 10 } : null;
          })
          .filter(Boolean);
        const rest = categories.filter((c) => !ids.includes(c.id));
        writeCategories([...sorted, ...rest]);
        return sorted;
      }
    },

    // ── Recurring ──────────────────────────────────────────────────────────

    recurring: {
      async list() {
        return readRecurring().sort((a, b) => {
          const mc = a.startMonth.localeCompare(b.startMonth);
          return mc !== 0 ? mc : String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
        });
      },
      async add(input) {
        validateRecurringMonthRange(input.startMonth, input.endMonth || null);
        const items = readRecurring();
        const newItem = {
          id: `r-${Date.now()}`,
          type: input.type === "income" ? "income" : "fee",
          categoryId: input.type === "fee" ? String(input.categoryId || "other") : null,
          title: String(input.title || "").trim(),
          amount: Number(input.amount ?? 0),
          startMonth: input.startMonth,
          endMonth: input.endMonth || null,
          createdAt: new Date().toISOString()
        };
        items.push(newItem);
        writeRecurring(items);
        return newItem;
      },
      async update(input) {
        validateRecurringMonthRange(input.startMonth, input.endMonth || null);
        const items = readRecurring();
        const idx = items.findIndex((r) => r.id === input.id);
        if (idx === -1) throw new Error("Recurring item not found");
        items[idx] = {
          ...items[idx],
          type: input.type === "income" ? "income" : "fee",
          categoryId: input.type === "fee" ? String(input.categoryId || "other") : null,
          title: String(input.title || "").trim(),
          amount: Number(input.amount ?? 0),
          startMonth: input.startMonth,
          endMonth: input.endMonth || null
        };
        writeRecurring(items);
        return items[idx];
      },
      async delete({ id }) {
        const items = readRecurring();
        const next = items.filter((item) => String(item.id) !== String(id));
        if (next.length === items.length) {
          throw new Error("Recurring item not found");
        }
        writeRecurring(next);
        return { id };
      }
    },

    // ── History ────────────────────────────────────────────────────────────

    history: {
      async list({ limit = 200 } = {}) {
        const db = await getDb();
        const res = await db.query(
          `SELECT id, source, action, type, title, amount, target_date AS entryDate,
                  category_id AS categoryId, note, logged_at AS loggedAt
           FROM input_logs ORDER BY logged_at DESC, id DESC LIMIT ?`,
          [limit]
        );
        return (res.values || []).map((r) => ({ ...r, source: r.source || "daily" }));
      }
    },

    // ── Summary ────────────────────────────────────────────────────────────

    summary: {
      async month({ month, categoryId, fromDate, toDate } = {}) {
        if (!month) return { fee: 0, income: 0, dailyFee: 0, dailyIncome: 0, recurringFee: 0, recurringIncome: 0 };
        const db = await getDb();

        const from = fromDate && fromDate > monthStart(month) ? fromDate : monthStart(month);
        const to   = toDate   && toDate   < monthEnd(month)   ? toDate   : monthEnd(month);
        const noDateOverlap = from > to;

        const catFilter = categoryId ? "AND category_id=?" : "";
        const params = [from, to, ...(categoryId ? [categoryId] : [])];

        const dailyFeeRes = await db.query(
          `SELECT COALESCE(SUM(amount),0) AS total FROM daily_entries WHERE type='fee' AND entry_date>=? AND entry_date<=? ${catFilter}`,
          params
        );
        const dailyIncomeRes = await db.query(
          `SELECT COALESCE(SUM(amount),0) AS total FROM daily_entries WHERE type='income' AND entry_date>=? AND entry_date<=? ${catFilter}`,
          params
        );

        const dailyFee = dailyFeeRes.values?.[0]?.total || 0;
        const dailyIncome = dailyIncomeRes.values?.[0]?.total || 0;
        const recurringFee = noDateOverlap ? 0 : sumRecurringByType(month, "fee", categoryId || null);
        const recurringIncome = categoryId ? 0 : sumRecurringByType(month, "income");

        return {
          fee: dailyFee + recurringFee,
          income: dailyIncome + recurringIncome,
          dailyFee,
          dailyIncome,
          recurringFee,
          recurringIncome
        };
      },

      async range({ fromMonth, toMonth, categoryId, fromDate, toDate } = {}) {
        if (!fromMonth || !toMonth) return [];
        const results = [];
        let m = fromMonth;
        while (m <= toMonth) {
          const summary = await this.month({ month: m, categoryId, fromDate, toDate });
          results.push({ month: m, ...summary });
          const [y, mo] = m.split("-").map(Number);
          const next = new Date(y, mo, 1);
          m = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
        }
        return results;
      },

      async categoryBreakdown({ month, locale = "jp" } = {}) {
        if (!month) return [];
        const db = await getDb();
        const categoryMap = new Map(readCategories().map((item) => [item.id, item]));
        const totals = new Map();
        const res = await db.query(
          `SELECT category_id AS categoryId, COALESCE(SUM(amount),0) AS total
           FROM daily_entries
           WHERE type='fee' AND entry_date>=? AND entry_date<=?
           GROUP BY category_id ORDER BY total DESC`,
          [monthStart(month), monthEnd(month)]
        );

        (res.values || []).forEach((row) => {
          const key = String(row.categoryId || "other");
          const current = totals.get(key) || 0;
          totals.set(key, current + Number(row.total || 0));
        });

        readRecurring().forEach((item) => {
          const endMonth = item.endMonth || null;
          const inRange = item.startMonth <= month && (!endMonth || month <= endMonth);
          if (item.type !== "fee" || !inRange) {
            return;
          }
          const key = String(item.categoryId || "other");
          const current = totals.get(key) || 0;
          totals.set(key, current + Number(item.amount || 0));
        });

        return Array.from(totals.entries())
          .map(([categoryId, total]) => {
            const category = categoryMap.get(categoryId) || null;
            return {
              categoryId,
              total,
              categoryDisplay: pickCategoryLabel(category, locale),
              categoryIcon: category?.icon || "🏷️"
            };
          })
          .sort((a, b) => b.total - a.total);
      },

      async categoryTrend({ fromMonth, toMonth, locale = "jp" } = {}) {
        if (!fromMonth || !toMonth) return [];
        const db = await getDb();
        const categoryMap = new Map(readCategories().map((item) => [item.id, item]));
        const totals = new Map();
        const res = await db.query(
          `SELECT substr(entry_date,1,7) AS month, category_id AS categoryId, COALESCE(SUM(amount),0) AS total
           FROM daily_entries
           WHERE type='fee' AND entry_date>=? AND entry_date<=?
           GROUP BY substr(entry_date,1,7), category_id ORDER BY month ASC`,
          [monthStart(fromMonth), monthEnd(toMonth)]
        );

        (res.values || []).forEach((row) => {
          const key = `${row.month}::${String(row.categoryId || "other")}`;
          const current = totals.get(key) || 0;
          totals.set(key, current + Number(row.total || 0));
        });

        const recurringItems = readRecurring();
        let monthCursor = fromMonth;
        while (monthCursor <= toMonth) {
          recurringItems.forEach((item) => {
            const endMonth = item.endMonth || null;
            const inRange = item.startMonth <= monthCursor && (!endMonth || monthCursor <= endMonth);
            if (item.type !== "fee" || !inRange) {
              return;
            }
            const categoryId = String(item.categoryId || "other");
            const key = `${monthCursor}::${categoryId}`;
            const current = totals.get(key) || 0;
            totals.set(key, current + Number(item.amount || 0));
          });
          const [y, m] = monthCursor.split("-").map(Number);
          const next = new Date(y, m, 1);
          monthCursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
        }

        return Array.from(totals.entries())
          .map(([compositeKey, total]) => {
            const [month, categoryId] = compositeKey.split("::");
            const category = categoryMap.get(categoryId) || null;
            return {
              month,
              categoryId,
              total,
              categoryDisplay: pickCategoryLabel(category, locale),
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
      },

      async cachePath() {
        return null; // Android has no file-based cache
      }
    }
  };
}
