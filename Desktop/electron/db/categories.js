import fs from "node:fs";
import { DEFAULT_CATEGORIES } from "./constants.js";

function ensureJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
  }
}

function normalizeCategoryRecord(item, fallbackSortOrder = 0) {
  return {
    id: String(item.id || "").trim(),
    nameJp: String(item.nameJp || "").trim(),
    nameEn: String(item.nameEn || "").trim(),
    nameDe: String(item.nameDe || "").trim(),
    icon: String(item.icon || "\uD83C\uDFF7\uFE0F").trim() || "\uD83C\uDFF7\uFE0F",
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : fallbackSortOrder,
    isActive: Number(item.isActive) === 0 ? 0 : 1
  };
}

export function pickCategoryName(category, locale = "jp") {
  if (!category) {
    return locale === "de" ? "Sonstiges" : locale === "en" ? "Other" : "その他";
  }
  if (locale === "de") {
    return category.nameDe || category.nameEn || category.nameJp;
  }
  if (locale === "en") {
    return category.nameEn || category.nameJp;
  }
  return category.nameJp || category.nameEn;
}

export function createCategoryStore({
  db,
  categoriesJsonPath,
  authGuard,
  normalizeCategoryId,
  rebindDailyEntriesToOtherStmt,
  migrateDailyCategoryIdByIdStmt
}) {
  function readCategoriesFile() {
    ensureJsonFile(categoriesJsonPath, { items: DEFAULT_CATEGORIES.map((item) => ({ ...item, isActive: 1 })) });
    const raw = JSON.parse(fs.readFileSync(categoriesJsonPath, "utf8"));
    const items = Array.isArray(raw.items) ? raw.items : [];
    return items
      .map((item, index) => normalizeCategoryRecord(item, (index + 1) * 10))
      .filter((item) => item.id && item.nameJp && item.nameEn && item.nameDe)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function writeCategoriesFile(items) {
    fs.writeFileSync(
      categoriesJsonPath,
      JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2),
      "utf8"
    );
  }

  function bootstrapCategoriesFromDbIfNeeded() {
    if (fs.existsSync(categoriesJsonPath)) {
      return;
    }

    const categoriesTableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'categories'")
      .get();

    if (!categoriesTableExists) {
      writeCategoriesFile(DEFAULT_CATEGORIES.map((item) => ({ ...item, isActive: 1 })));
      return;
    }

    const rows = db
      .prepare(`
        SELECT id, name_jp AS nameJp, name_en AS nameEn, name_de AS nameDe, icon, sort_order AS sortOrder, is_active AS isActive
        FROM categories
        ORDER BY sort_order ASC, created_at ASC
      `)
      .all();

    if (rows.length === 0) {
      writeCategoriesFile(DEFAULT_CATEGORIES.map((item) => ({ ...item, isActive: 1 })));
      return;
    }

    writeCategoriesFile(rows.map((row, index) => normalizeCategoryRecord(row, (index + 1) * 10)));
  }

  function ensureDefaultCategories() {
    bootstrapCategoriesFromDbIfNeeded();
    const current = readCategoriesFile();
    if (current.length === 0) {
      writeCategoriesFile(DEFAULT_CATEGORIES.map((item) => ({ ...item, isActive: 1 })));
      return;
    }

    const byId = new Map(current.map((item) => [item.id, item]));
    const merged = [...current];
    let changed = false;

    DEFAULT_CATEGORIES.forEach((item) => {
      if (!byId.has(item.id)) {
        merged.push({ ...item, isActive: 1 });
        changed = true;
      }
    });

    if (changed) {
      writeCategoriesFile(merged.sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }

  function migrateLegacyDailyCategories() {
    const categoryRows = readCategoriesFile();
    const legacyNameMap = new Map();
    categoryRows.forEach((item) => {
      legacyNameMap.set(item.nameEn, item.id);
      legacyNameMap.set(item.nameJp, item.id);
      legacyNameMap.set(item.nameDe, item.id);
    });

    const tx = db.transaction(() => {
      categoryRows.forEach((item) => {
        migrateDailyCategoryIdByIdStmt.run({ categoryId: item.id, legacyName: item.nameEn });
      });

      const legacyNames = db
        .prepare("SELECT DISTINCT category FROM daily_entries WHERE category_id IS NULL AND category IS NOT NULL")
        .all();

      legacyNames.forEach((row) => {
        const name = String(row.category || "").trim();
        if (!name) {
          return;
        }
        const categoryId = legacyNameMap.get(name);
        if (categoryId) {
          migrateDailyCategoryIdByIdStmt.run({ categoryId, legacyName: name });
        }
      });

      db.exec("UPDATE daily_entries SET category_id = 'other' WHERE category_id IS NULL AND type = 'fee'");
    });
    tx();
  }

  function listCategories(input = {}) {
    authGuard.ensureAuthorized(input?.authToken);
    const includeInactive = Boolean(input.includeInactive);
    const rows = readCategoriesFile();
    if (includeInactive) {
      return rows;
    }
    return rows.filter((row) => Number(row.isActive) === 1);
  }

  function addCategory(input) {
    authGuard.ensureAuthorized(input?.authToken);
    const id = normalizeCategoryId(input.id || input.nameEn || input.nameJp || input.nameDe || input.name);
    const fallbackId = id || `category-${Date.now()}`;

    const nameJp = String(input.nameJp || input.name || "").trim() || fallbackId;
    const nameEn = String(input.nameEn || input.name || "").trim() || fallbackId;
    const nameDe = String(input.nameDe || input.name || "").trim() || fallbackId;
    const icon = String(input.icon || "").trim() || "\uD83C\uDFF7\uFE0F";
    const rows = readCategoriesFile();
    const maxOrder = rows.reduce((max, item) => Math.max(max, Number(item.sortOrder) || 0), 0);
    const sortOrder = Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : maxOrder + 10;

    if (rows.some((item) => item.id === fallbackId)) {
      throw new Error("同じカテゴリIDが既に存在します。");
    }

    const created = { id: fallbackId, nameJp, nameEn, nameDe, icon, sortOrder, isActive: 1 };
    writeCategoriesFile([...rows, created].sort((a, b) => a.sortOrder - b.sortOrder));
    return created;
  }

  function ensureCategoryForImport(name) {
    const rawName = String(name || "").trim();
    if (!rawName) {
      return null;
    }

    const id = normalizeCategoryId(rawName);
    if (!id) {
      return null;
    }

    const rows = readCategoriesFile();
    const existing = rows.find((item) => item.id === id);
    if (existing) {
      return existing;
    }

    const maxOrder = rows.reduce((max, item) => Math.max(max, Number(item.sortOrder) || 0), 0);
    const created = {
      id,
      nameJp: rawName,
      nameEn: rawName,
      nameDe: rawName,
      icon: "🏷️",
      sortOrder: maxOrder + 10,
      isActive: 1
    };

    writeCategoriesFile([...rows, created].sort((a, b) => a.sortOrder - b.sortOrder));
    return created;
  }

  function updateCategory(input) {
    authGuard.ensureAuthorized(input?.authToken);
    const id = String(input.id || "").trim();
    if (!id) {
      throw new Error("更新対象のカテゴリIDが必要です。");
    }

    const rows = readCategoriesFile();
    const current = rows.find((item) => item.id === id);
    if (!current) {
      throw new Error("カテゴリが見つかりません。");
    }

    const nameJp = String(input.nameJp ?? current.nameJp).trim() || current.nameJp;
    const nameEn = String(input.nameEn ?? current.nameEn).trim() || current.nameEn;
    const nameDe = String(input.nameDe ?? current.nameDe).trim() || current.nameDe;
    const icon = String(input.icon ?? (current.icon || "\uD83C\uDFF7\uFE0F")).trim() || "\uD83C\uDFF7\uFE0F";

    const updated = rows.map((item) => {
      if (item.id !== id) {
        return item;
      }
      return {
        ...item,
        nameJp,
        nameEn,
        nameDe,
        icon
      };
    });
    writeCategoriesFile(updated);
    return updated.find((item) => item.id === id);
  }

  function deleteCategory(input) {
    authGuard.ensureAuthorized(input?.authToken);
    const id = String(input.id || "").trim();
    if (!id) {
      throw new Error("削除対象のカテゴリIDが必要です。");
    }
    if (id === "other") {
      throw new Error("other カテゴリは削除できません。");
    }

    const rows = readCategoriesFile();
    if (!rows.some((item) => item.id === id)) {
      throw new Error("カテゴリが見つかりません。");
    }

    const tx = db.transaction(() => {
      rebindDailyEntriesToOtherStmt.run({ id });
    });
    tx();

    const updated = rows.map((item) => {
      if (item.id !== id) {
        return item;
      }
      return { ...item, isActive: 0 };
    });
    writeCategoriesFile(updated);
    return { ok: true };
  }

  function reorderCategories(input) {
    authGuard.ensureAuthorized(input?.authToken);
    if (!Array.isArray(input.ids) || input.ids.length === 0) {
      throw new Error("並び替え対象のカテゴリID配列が必要です。");
    }

    const rows = readCategoriesFile();
    const byId = new Map(rows.map((item) => [item.id, item]));
    input.ids.forEach((id) => {
      if (!byId.has(id)) {
        throw new Error(`カテゴリが見つかりません: ${id}`);
      }
    });

    const used = new Set(input.ids);
    const remain = rows.filter((item) => !used.has(item.id)).sort((a, b) => a.sortOrder - b.sortOrder);
    const ordered = input.ids.map((id) => byId.get(id));
    const merged = [...ordered, ...remain].map((item, index) => ({
      ...item,
      sortOrder: (index + 1) * 10
    }));

    writeCategoriesFile(merged);
    return { ok: true };
  }

  function replaceCategoriesForSync(items) {
    if (!Array.isArray(items)) {
      throw new Error("同期カテゴリデータが不正です。");
    }
    const normalized = items
      .map((item, index) => normalizeCategoryRecord(item, (index + 1) * 10))
      .filter((item) => item.id && item.nameJp && item.nameEn && item.nameDe)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (normalized.length === 0) {
      throw new Error("同期カテゴリデータが空です。");
    }

    writeCategoriesFile(normalized);
    migrateLegacyDailyCategories();
    return { count: normalized.length };
  }

  function getCategoryMap() {
    return new Map(readCategoriesFile().map((item) => [item.id, item]));
  }

  return {
    ensureDefaultCategories,
    migrateLegacyDailyCategories,
    listCategories,
    addCategory,
    ensureCategoryForImport,
    updateCategory,
    deleteCategory,
    reorderCategories,
    replaceCategoriesForSync,
    getCategoryMap
  };
}
