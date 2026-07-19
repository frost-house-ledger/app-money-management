/**
 * Android / Capacitor adapter.
 * Uses @capacitor-community/sqlite for persistent storage and localStorage for
 * JSON-based stores (categories, recurring items).
 *
 * Database schema mirrors Desktop/electron/db/schema-input.js.
 */
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { logError } from "./logger.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_NAME = "ledger";
const LS_CATEGORIES = "android.categories";
const LS_RECURRING = "android.recurring";

const DEFAULT_CATEGORIES = [
  { id: "food",          nameJp: "食費",      nameEn: "Food",          icon: "🍽️",  sortOrder: 10,  isActive: 1 },
  { id: "beverage",      nameJp: "飲料",      nameEn: "Beverage",      icon: "☕",  sortOrder: 15,  isActive: 1 },
  { id: "transport",     nameJp: "交通",      nameEn: "Transport",     icon: "🚌",  sortOrder: 20,  isActive: 1 },
  { id: "housing",       nameJp: "住居",      nameEn: "Housing",       icon: "🏠",  sortOrder: 30,  isActive: 1 },
  { id: "utilities",     nameJp: "光熱費",    nameEn: "Utilities",     icon: "💡",  sortOrder: 40,  isActive: 1 },
  { id: "medical",       nameJp: "医療",      nameEn: "Medical",       icon: "💊",  sortOrder: 50,  isActive: 1 },
  { id: "education",     nameJp: "教育",      nameEn: "Education",     icon: "📚",  sortOrder: 60,  isActive: 1 },
  { id: "entertainment", nameJp: "娯楽",      nameEn: "Entertainment", icon: "🎬",  sortOrder: 70,  isActive: 1 },
  { id: "travel",        nameJp: "旅行",      nameEn: "Travel",        icon: "✈️",  sortOrder: 80,  isActive: 1 },
  { id: "shopping",      nameJp: "買い物",    nameEn: "Shopping",      icon: "🛍️", sortOrder: 90,  isActive: 1 },
  { id: "subscription",  nameJp: "サブスク",  nameEn: "Subscription",  icon: "🔁",  sortOrder: 110,  isActive: 1 },
  { id: "insurance",     nameJp: "保険",      nameEn: "Insurance",     icon: "⚕️",  sortOrder: 100,  isActive: 1 },
  { id: "other",         nameJp: "その他",    nameEn: "Other",         icon: "📦",  sortOrder: 120, isActive: 1 }
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    CREATE TABLE IF NOT EXISTS category_targets (
      month TEXT NOT NULL,
      category_id TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (month, category_id)
    );
  `);
  await _db.execute("ALTER TABLE daily_entries ADD COLUMN sync_id TEXT;", false).catch((err) => {
    logError("getDb - ALTER TABLE add sync_id", err);
  });
  await _db.execute("ALTER TABLE daily_entries ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));", false).catch((err) => {
    logError("getDb - ALTER TABLE add updated_at", err);
  });
  await _db.execute("UPDATE daily_entries SET updated_at = COALESCE(updated_at, created_at, datetime('now')) WHERE updated_at IS NULL OR updated_at = '';", false).catch((err) => {
    logError("getDb - UPDATE daily_entries set updated_at", err);
  });
  return _db;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function createSyncId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
      return Array.isArray(parsed.items)
        ? parsed.items.map((item) => ({ ...item, updatedAt: item.updatedAt || "1970-01-01T00:00:00.000Z" }))
        : DEFAULT_CATEGORIES;
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
    // Show Japanese only for Japanese locale; otherwise show English
    return locale === "jp" || locale === "ja" ? "その他" : "Other";
  }
  // Prefer Japanese when explicitly Japanese; otherwise prefer English.
  if (locale === "jp" || locale === "ja") {
    return category.nameJp || category.nameEn || category.id;
  }
  return category.nameEn || category.nameJp || category.id;
}

// ─── Recurring store (localStorage) ──────────────────────────────────────────

function readRecurring() {
  try {
    const raw = localStorage.getItem(LS_RECURRING);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.items)
        ? parsed.items.map((item) => ({
          ...item,
          updatedAt: item.updatedAt || item.createdAt || nowIso()
        }))
        : [];
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

function sumRecurringSalary(month) {
  return readRecurring()
    .filter((item) => {
      const endMonth = item.endMonth || null;
      const inRange = item.startMonth <= month && (!endMonth || month <= endMonth);
      return item.type === "income" && inRange && Boolean(item.isSalary);
    })
    .reduce((total, item) => total + Number(item.amount || 0), 0);
}

function normalizeDesktopUrl(url) {
  const value = String(url || "").trim();
  if (!value) {
    throw new Error("Desktop URL is required");
  }
  const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;
  return withScheme.replace(/\/+$/, "");
}

function normalizeFetchError(error, url) {
  const message = String(error?.message || "");
  if (/Failed to fetch|NetworkError|Load failed|fetch/i.test(message)) {
    return new Error(
      `Desktop sync server could not be reached: ${url}. ` +
      "Make sure the Desktop app is open, the Desktop URL is correct, both devices are on the same network, and Windows Firewall allows port 30303."
    );
  }
  return error instanceof Error ? error : new Error(message || "Sync request failed");
}

async function fetchJson(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error || `HTTP ${res.status}`);
    }
    return json;
  } catch (error) {
    throw normalizeFetchError(error, url);
  } finally {
    clearTimeout(timer);
  }
}

async function exportLocalSyncData() {
  const db = await getDb();
  const dailyRes = await db.query(
      `SELECT id, sync_id AS syncId, type, title, amount, entry_date AS entryDate, category_id AS categoryId,
        note, created_at AS createdAt, updated_at AS updatedAt
     FROM daily_entries
     ORDER BY id ASC`
  );
  const logRes = await db.query(
    `SELECT id, source, action, type, title, amount, target_date AS targetDate,
            category_id AS categoryId, note, logged_at AS loggedAt
     FROM input_logs
     ORDER BY id ASC`
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: readCategories(),
    recurring: readRecurring(),
    dailyEntries: (dailyRes.values || []).map((row) => ({
      ...row,
      category: row.type === "fee" ? String(row.categoryId || "other") : null
    })),
    inputLogs: (logRes.values || []).map((row) => ({
      ...row,
      category: row.type === "fee" ? String(row.categoryId || "other") : null,
      payloadJson: null
    }))
  };
}

async function importLocalSyncData(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Invalid sync payload");
  }
  const categories = Array.isArray(snapshot.categories) ? snapshot.categories : [];
  const recurring = Array.isArray(snapshot.recurring) ? snapshot.recurring : [];
  const dailyEntries = Array.isArray(snapshot.dailyEntries) ? snapshot.dailyEntries : [];
  const inputLogs = Array.isArray(snapshot.inputLogs) ? snapshot.inputLogs : [];

  writeCategories(categories.length > 0 ? categories : DEFAULT_CATEGORIES.map((item) => ({ ...item })));
  writeRecurring(recurring);

  const db = await getDb();
  await db.execute("DELETE FROM input_logs;");
  await db.execute("DELETE FROM daily_entries;");

  for (let i = 0; i < dailyEntries.length; i++) {
    const row = dailyEntries[i];
    await db.run(
      `INSERT INTO daily_entries(id, sync_id, type, title, amount, entry_date, category_id, note, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        i + 1,
        row.syncId ? String(row.syncId) : createSyncId(),
        row.type === "income" ? "income" : "fee",
        String(row.title || ""),
        Number(row.amount || 0),
        String(row.entryDate || todayISO()),
        row.type === "fee" ? String(row.categoryId || "other") : null,
        row.note ? String(row.note) : "",
        row.createdAt ? String(row.createdAt) : nowIso(),
        row.updatedAt ? String(row.updatedAt) : (row.createdAt ? String(row.createdAt) : nowIso())
      ]
    );
  }

  for (let i = 0; i < inputLogs.length; i++) {
    const row = inputLogs[i];
    await db.run(
      `INSERT INTO input_logs(id, source, action, type, title, amount, target_date, category_id, note, logged_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        i + 1,
        row.source === "monthly" ? "monthly" : "daily",
        String(row.action || "add"),
        row.type === "income" ? "income" : "fee",
        String(row.title || ""),
        Number(row.amount || 0),
        String(row.targetDate || todayISO()),
        row.type === "fee" ? String(row.categoryId || "other") : null,
        row.note ? String(row.note) : "",
        row.loggedAt ? String(row.loggedAt) : new Date().toISOString()
      ]
    );
  }

  return {
    ok: true,
    counts: {
      categories: categories.length,
      recurring: recurring.length,
      dailyEntries: dailyEntries.length,
      inputLogs: inputLogs.length
    }
  };
}

function getItemTimestamp(item, fields = ["updatedAt", "createdAt", "loggedAt", "exportedAt"]) {
  for (const field of fields) {
    const value = item?.[field];
    const ts = value ? Date.parse(String(value)) : NaN;
    if (Number.isFinite(ts)) {
      return ts;
    }
  }
  return 0;
}

function getDailyEntryMergeKey(entry) {
  return String(
    entry?.syncId ||
    [
      entry?.createdAt || "",
      entry?.type || "",
      entry?.entryDate || "",
      entry?.title || "",
      Number(entry?.amount || 0),
      entry?.categoryId || "",
      entry?.note || ""
    ].join("::")
  );
}

function getLogMergeKey(log) {
  return [
    log?.source || "",
    log?.action || "",
    log?.type || "",
    log?.title || "",
    Number(log?.amount || 0),
    log?.targetDate || "",
    log?.categoryId || "",
    log?.note || "",
    log?.loggedAt || ""
  ].join("::");
}

function mergeByKey(localItems, remoteItems, getKey, getTimestamp) {
  const merged = new Map();

  for (const item of [...(remoteItems || []), ...(localItems || [])]) {
    const key = getKey(item);
    if (!key) {
      continue;
    }

    const current = merged.get(key);
    if (!current) {
      merged.set(key, item);
      continue;
    }

    if (getTimestamp(item) >= getTimestamp(current)) {
      merged.set(key, item);
    }
  }

  return Array.from(merged.values());
}

function mergeSyncSnapshots(localSnapshot, remoteSnapshot) {
  const mergedCategories = mergeByKey(
    localSnapshot?.categories || [],
    remoteSnapshot?.categories || [],
    (item) => String(item?.id || ""),
    (item) => getItemTimestamp(item)
  ).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

  const mergedRecurring = mergeByKey(
    localSnapshot?.recurring || [],
    remoteSnapshot?.recurring || [],
    (item) => String(item?.id || ""),
    (item) => getItemTimestamp(item)
  ).sort((a, b) => {
    const monthCompare = String(a.startMonth || "").localeCompare(String(b.startMonth || ""));
    if (monthCompare !== 0) {
      return monthCompare;
    }
    return getItemTimestamp(a) - getItemTimestamp(b);
  });

  const mergedDailyEntries = mergeByKey(
    localSnapshot?.dailyEntries || [],
    remoteSnapshot?.dailyEntries || [],
    getDailyEntryMergeKey,
    (item) => getItemTimestamp(item)
  ).sort((a, b) => getItemTimestamp(a) - getItemTimestamp(b));

  const mergedLogs = Array.from(
    new Map(
      [...(remoteSnapshot?.inputLogs || []), ...(localSnapshot?.inputLogs || [])].map((item) => [getLogMergeKey(item), item])
    ).values()
  ).sort((a, b) => getItemTimestamp(a, ["loggedAt"]) - getItemTimestamp(b, ["loggedAt"]));

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    categories: mergedCategories,
    recurring: mergedRecurring,
    dailyEntries: mergedDailyEntries,
    inputLogs: mergedLogs
  };
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
          `INSERT INTO daily_entries(sync_id, type, title, amount, entry_date, category_id, note, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [createSyncId(), type, String(input.title || "").trim(), amount, entryDate, categoryId, input.note || "", nowIso(), nowIso()]
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
           `UPDATE daily_entries SET type=?, title=?, amount=?, entry_date=?, category_id=?, note=?, updated_at=? WHERE id=?`,
          [type, String(input.title || "").trim(), Number(input.amount ?? 0),
            input.entryDate || todayISO(), categoryId, input.note || "", nowIso(), input.id]
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
           , sync_id AS syncId, updated_at AS updatedAt
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
              icon: "🏷️", sortOrder: (categories.length + 1) * 10, isActive: 1, updatedAt: nowIso()
            };
            categories.push(newCat);
            catMap[categoryId] = newCat;
          }

          await db.run(
            `INSERT INTO daily_entries(sync_id, type, title, amount, entry_date, category_id, note, created_at, updated_at)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [createSyncId(), type, title, amount, entryDate, type === "fee" ? categoryId : null, row.description || row.note || "", nowIso(), nowIso()]
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
          isActive: 1,
          updatedAt: nowIso()
        };
        categories.push(newCat);
        writeCategories(categories);
        return newCat;
      },
      async update(input) {
        const categories = readCategories();
        const idx = categories.findIndex((c) => c.id === input.id);
        if (idx === -1) throw new Error("Category not found");
        categories[idx] = { ...categories[idx], ...input, updatedAt: nowIso() };
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
            return cat ? { ...cat, sortOrder: (i + 1) * 10, updatedAt: nowIso() } : null;
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
          note: String(input.note || ""),
          startMonth: input.startMonth,
          endMonth: input.endMonth || null,
          isSalary: Boolean(input.isSalary),
          createdAt: nowIso(),
          updatedAt: nowIso()
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
          note: String(input.note || ""),
          isSalary: Boolean(input.isSalary),
          startMonth: input.startMonth,
          endMonth: input.endMonth || null,
          updatedAt: nowIso()
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
      async month({ month, categoryId, fromDate, toDate, salaryOnly } = {}) {
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
        const recurringSalary = noDateOverlap ? 0 : sumRecurringSalary(month);
        const salaryTotal = Number(recurringSalary || 0);

        if (salaryOnly) {
          return {
            fee: dailyFee + recurringFee,
            income: salaryTotal,
            dailyFee,
            dailyIncome: 0,
            recurringFee,
            recurringIncome: salaryTotal,
            salary: salaryTotal
          };
        }

        return {
          fee: dailyFee + recurringFee,
          income: dailyIncome + recurringIncome,
          dailyFee,
          dailyIncome,
          recurringFee,
          recurringIncome,
          salary: salaryTotal
        };
      },

      async range({ fromMonth, toMonth, categoryId, fromDate, toDate, salaryOnly } = {}) {
        if (!fromMonth || !toMonth) return [];
        const results = [];
        let m = fromMonth;
        while (m <= toMonth) {
          const summary = await this.month({ month: m, categoryId, fromDate, toDate, salaryOnly });
          results.push({ month: m, ...summary });
          const [y, mo] = m.split("-").map(Number);
          const next = new Date(y, mo, 1);
          m = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
        }
        return results;
      },

      // ── Targets ───────────────────────────────────────────────────────────
      targets: {
        async get(monthOrObj = {}) {
          const month = typeof monthOrObj === "string" ? monthOrObj : (monthOrObj && monthOrObj.month);
          validateMonthValue(month, "month");
          const db = await getDb();
          const res = await db.query(
            `SELECT category_id AS categoryId, amount FROM category_targets WHERE month = ?`,
            [String(month)]
          );
          return (res.values || []).map((r) => ({ categoryId: r.categoryId, amount: Number(r.amount || 0) }));
        },
        async save({ month, targets = {} } = {}) {
          validateMonthValue(month, "month");
          const db = await getDb();
          await db.run(`DELETE FROM category_targets WHERE month = ?`, [String(month)]);
          const entries = Object.entries(targets || {});
          for (let i = 0; i < entries.length; i++) {
            const [categoryId, amount] = entries[i];
            await db.run(
              `INSERT INTO category_targets(month, category_id, amount, updated_at) VALUES (?,?,?,?)`,
              [String(month), String(categoryId), Number(amount || 0), nowIso()]
            );
          }
          return { ok: true };
        }
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
    },

    // ── Sync ──────────────────────────────────────────────────────────────

    sync: {
      async serverInfo({ desktopUrl } = {}) {
        const trimmed = String(desktopUrl || "").trim();
        if (!trimmed) {
          return null;
        }

        const baseUrl = normalizeDesktopUrl(trimmed);
        const info = await fetchJson(`${baseUrl}/sync/ping`, { method: "GET" });
        const urls = Array.isArray(info?.urls) && info.urls.length > 0 ? info.urls : [baseUrl];

        return {
          running: Boolean(info?.ok),
          port: 30303,
          urls
        };
      },

      async exportData() {
        return exportLocalSyncData();
      },

      async importData(payload) {
        return importLocalSyncData(payload);
      },

      async pushToDesktop({ desktopUrl }) {
        const baseUrl = normalizeDesktopUrl(desktopUrl);
        const payload = await exportLocalSyncData();
        return fetchJson(`${baseUrl}/sync/import`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
      },

      async pullFromDesktop({ desktopUrl }) {
        const baseUrl = normalizeDesktopUrl(desktopUrl);
        const snapshot = await fetchJson(`${baseUrl}/sync/export`, { method: "GET" });
        const imported = await importLocalSyncData(snapshot);
        return { ok: true, imported };
      },

      async syncNow({ desktopUrl }) {
        const baseUrl = normalizeDesktopUrl(desktopUrl);
        await fetchJson(`${baseUrl}/sync/ping`, { method: "GET" });
        const localSnapshot = await exportLocalSyncData();
        const remoteSnapshot = await fetchJson(`${baseUrl}/sync/export`, { method: "GET" });
        const mergedSnapshot = mergeSyncSnapshots(localSnapshot, remoteSnapshot);
        const pushed = await fetchJson(`${baseUrl}/sync/import`, {
          method: "POST",
          body: JSON.stringify(mergedSnapshot)
        });
        const imported = await importLocalSyncData(mergedSnapshot);
        return { ok: true, pushed, pulled: { ok: true, imported }, mergedSnapshot };
      }
    }
  };
}
