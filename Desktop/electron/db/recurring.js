import fs from "node:fs";

function ensureJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
  }
}

export function createRecurringStore({
  db,
  recurringJsonPath,
  authGuard,
  validateType,
  validateMonth,
  ensureAmount,
  logInput,
  rebuildMonthlyJsonCache
}) {
  function readRecurringItems() {
    ensureJsonFile(recurringJsonPath, { items: [] });
    const raw = JSON.parse(fs.readFileSync(recurringJsonPath, "utf8"));
    return Array.isArray(raw.items) ? raw.items : [];
  }

  function ensureValidMonthRange(startMonth, endMonth) {
    if (!endMonth) {
      return;
    }
    validateMonth(endMonth);
    if (startMonth > endMonth) {
      throw new Error("開始月は終了月以下にしてください。");
    }
  }

  function writeRecurringItems(items) {
    fs.writeFileSync(
      recurringJsonPath,
      JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2),
      "utf8"
    );
  }

  function migrateRecurringItemsToJson() {
    ensureJsonFile(recurringJsonPath, { items: [] });
    const currentItems = readRecurringItems();
    if (currentItems.length > 0) {
      return;
    }

    const recurringTableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'recurring_items'")
      .get();

    if (!recurringTableExists) {
      return;
    }

    const recurringColumns = db.prepare("PRAGMA table_info(recurring_items)").all();
    const hasEndMonth = recurringColumns.some((column) => column.name === "end_month");
    const migrated = db
      .prepare(`
        SELECT id, type, title, amount, start_month AS startMonth,
               ${hasEndMonth ? "end_month" : "NULL"} AS endMonth,
               category_id AS categoryId, created_at AS createdAt
        FROM recurring_items
        ORDER BY start_month ASC, created_at ASC
      `)
      .all();

    if (migrated.length > 0) {
      writeRecurringItems(
        migrated.map((item) => ({
          ...item,
          id: String(item.id),
          endMonth: item.endMonth || null,
          categoryId: item.type === "fee" ? String(item.categoryId || "other") : null
        }))
      );
    }
  }

  function listRecurringItems() {
    return readRecurringItems().sort((a, b) => {
      const monthCompare = a.startMonth.localeCompare(b.startMonth);
      if (monthCompare !== 0) {
        return monthCompare;
      }
      return String(a.createdAt).localeCompare(String(b.createdAt));
    });
  }

  function sumRecurringByType(month, type, categoryId = null) {
    return listRecurringItems()
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

  function addRecurring(input) {
    authGuard.ensureAuthorized(input?.authToken);
    validateType(input.type);
    validateMonth(input.startMonth);
    ensureValidMonthRange(input.startMonth, input.endMonth || null);
    ensureAmount(input.amount);

    const title = String(input.title || "").trim();
    if (!title) {
      throw new Error("title を入力してください。");
    }

    const items = listRecurringItems();
    const createdAt = new Date().toISOString();
    const item = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: input.type,
      categoryId: input.type === "fee" ? String(input.categoryId || "other") : null,
      title,
      amount: input.amount,
      startMonth: input.startMonth,
      endMonth: input.endMonth || null,
      createdAt
    };
    writeRecurringItems([...items, item]);

    logInput({
      source: "monthly",
      type: input.type,
      title,
      amount: input.amount,
      targetDate: input.startMonth,
      payload: input
    });

    const cachePath = rebuildMonthlyJsonCache();
    return { id: item.id, cachePath };
  }

  function updateRecurring(input) {
    authGuard.ensureAuthorized(input?.authToken);
    validateType(input.type);
    validateMonth(input.startMonth);
    ensureValidMonthRange(input.startMonth, input.endMonth || null);
    ensureAmount(input.amount);

    const title = String(input.title || "").trim();
    if (!title) {
      throw new Error("title を入力してください。");
    }

    const items = listRecurringItems();
    const nextItems = items.map((item) => {
      if (item.id !== input.id) {
        return item;
      }

      return {
        ...item,
        type: input.type,
        categoryId: input.type === "fee" ? String(input.categoryId || "other") : null,
        title,
        amount: input.amount,
        startMonth: input.startMonth,
        endMonth: input.endMonth || null,
        updatedAt: new Date().toISOString()
      };
    });

    if (!nextItems.some((item) => item.id === input.id)) {
      throw new Error("更新対象の固定項目が見つかりません。");
    }

    writeRecurringItems(nextItems);
    logInput({
      source: "monthly",
      type: input.type,
      title,
      amount: input.amount,
      targetDate: input.startMonth,
      payload: { ...input, action: "update" }
    });

    const cachePath = rebuildMonthlyJsonCache();
    return { id: input.id, cachePath };
  }

  function deleteRecurring(input) {
    authGuard.ensureAuthorized(input?.authToken);
    const id = String(input?.id || "").trim();
    if (!id) {
      throw new Error("削除対象の固定項目IDが必要です。");
    }

    const items = listRecurringItems();
    const target = items.find((item) => String(item.id) === id);
    if (!target) {
      throw new Error("削除対象の固定項目が見つかりません。");
    }

    writeRecurringItems(items.filter((item) => String(item.id) !== id));
    logInput({
      source: "monthly",
      action: "delete",
      type: target.type,
      title: target.title,
      amount: target.amount,
      targetDate: target.startMonth,
      payload: {
        id: target.id,
        startMonth: target.startMonth,
        endMonth: target.endMonth || null,
        action: "delete"
      }
    });

    const cachePath = rebuildMonthlyJsonCache();
    return { id, cachePath };
  }

  function replaceRecurringItemsForSync(items) {
    if (!Array.isArray(items)) {
      throw new Error("同期固定項目データが不正です。");
    }

    const normalized = items
      .map((item) => ({
        id: String(item.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
        type: item.type === "income" ? "income" : "fee",
        categoryId: item.type === "fee" ? String(item.categoryId || "other") : null,
        title: String(item.title || "").trim(),
        amount: Number(item.amount || 0),
        startMonth: String(item.startMonth || ""),
        endMonth: item.endMonth ? String(item.endMonth) : null,
        createdAt: item.createdAt ? String(item.createdAt) : new Date().toISOString()
      }))
      .filter((item) => item.title && item.startMonth)
      .sort((a, b) => {
        const monthCompare = a.startMonth.localeCompare(b.startMonth);
        if (monthCompare !== 0) {
          return monthCompare;
        }
        return String(a.createdAt).localeCompare(String(b.createdAt));
      });

    writeRecurringItems(normalized);
    rebuildMonthlyJsonCache();
    return { count: normalized.length };
  }

  return {
    migrateRecurringItemsToJson,
    listRecurringItems,
    listRecurring: () => listRecurringItems(),
    sumRecurringByType,
    replaceRecurringItemsForSync,
    addRecurring,
    updateRecurring,
    deleteRecurring
  };
}
