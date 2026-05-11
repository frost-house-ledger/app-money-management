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

    const migrated = db
      .prepare(`
        SELECT id, type, title, amount, start_month AS startMonth, category_id AS categoryId, created_at AS createdAt
        FROM recurring_items
        ORDER BY start_month ASC, created_at ASC
      `)
      .all();

    if (migrated.length > 0) {
      writeRecurringItems(
        migrated.map((item) => ({
          ...item,
          id: String(item.id),
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
        if (!(item.type === type && item.startMonth <= month)) {
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

  return {
    migrateRecurringItemsToJson,
    listRecurringItems,
    listRecurring: () => listRecurringItems(),
    sumRecurringByType,
    addRecurring,
    updateRecurring
  };
}
