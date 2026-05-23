export function createBackupService({
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
}) {
  function getTimestamp(value, fallback = 0) {
    const parsed = value ? Date.parse(String(value)) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getDailyMergeKey(entry) {
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

  function getDailyContentKey(entry) {
    return [
      entry?.type || "",
      entry?.title || "",
      Number(entry?.amount || 0),
      entry?.entryDate || "",
      entry?.categoryId || "",
      entry?.note || ""
    ].join("::");
  }

  function getRecurringContentKey(item) {
    return [
      item?.type || "",
      item?.title || "",
      Number(item?.amount || 0),
      item?.startMonth || "",
      item?.endMonth || "",
      item?.categoryId || ""
    ].join("::");
  }

  function mergeByKey(currentItems, incomingItems, getKey, getItemTimestamp) {
    const merged = new Map();

    [...(currentItems || []), ...(incomingItems || [])].forEach((item) => {
      const key = getKey(item);
      if (!key) {
        return;
      }
      const existing = merged.get(key);
      if (!existing || getItemTimestamp(item) >= getItemTimestamp(existing)) {
        merged.set(key, item);
      }
    });

    return Array.from(merged.values());
  }

  function escapeCsvCell(value) {
    const text = String(value ?? "");
    if (/[,"\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function buildCsvText(rows) {
    const headers = [
      "record_scope",
      "id",
      "sync_id",
      "type",
      "title",
      "amount",
      "entry_date",
      "start_month",
      "end_month",
      "category_id",
      "category_name_jp",
      "category_name_en",
      "category_name_de",
      "category_icon",
      "note",
      "created_at",
      "updated_at"
    ];

    const lines = [headers.join(",")];
    rows.forEach((row) => {
      lines.push(headers.map((header) => escapeCsvCell(row[header] ?? "")).join(","));
    });
    return `${lines.join("\r\n")}\r\n`;
  }

  function exportBackupCsv(input = {}) {
    const scope = input.scope === "monthly" ? "monthly" : input.scope === "daily" ? "daily" : "all";
    const categoryMap = categoryStore.getCategoryMap();
    const dailyEntries = scope === "monthly"
      ? []
      : db.prepare(`
          SELECT id, sync_id AS syncId, type, title, amount, entry_date AS entryDate,
                 category_id AS categoryId, note, created_at AS createdAt, updated_at AS updatedAt
          FROM daily_entries
          ORDER BY entry_date ASC, id ASC
        `).all();
    const recurringItems = scope === "daily" ? [] : recurringStore.listRecurringItems();

    const rows = [
      ...dailyEntries.map((item) => {
        const category = item.categoryId ? categoryMap.get(item.categoryId) : null;
        return {
          record_scope: "daily",
          id: item.id,
          sync_id: item.syncId || "",
          type: item.type,
          title: item.title,
          amount: item.amount,
          entry_date: item.entryDate,
          start_month: "",
          end_month: "",
          category_id: item.categoryId || "",
          category_name_jp: category?.nameJp || "",
          category_name_en: category?.nameEn || "",
          category_name_de: category?.nameDe || "",
          category_icon: category?.icon || "",
          note: item.note || "",
          created_at: item.createdAt || "",
          updated_at: item.updatedAt || item.createdAt || ""
        };
      }),
      ...recurringItems.map((item) => {
        const category = item.categoryId ? categoryMap.get(item.categoryId) : null;
        return {
          record_scope: "monthly",
          id: item.id,
          sync_id: "",
          type: item.type,
          title: item.title,
          amount: item.amount,
          entry_date: "",
          start_month: item.startMonth,
          end_month: item.endMonth || "",
          category_id: item.categoryId || "",
          category_name_jp: category?.nameJp || "",
          category_name_en: category?.nameEn || "",
          category_name_de: category?.nameDe || "",
          category_icon: category?.icon || "",
          note: "",
          created_at: item.createdAt || "",
          updated_at: item.updatedAt || item.createdAt || ""
        };
      })
    ];

    return {
      scope,
      rowCount: rows.length,
      filename: `amm-${scope}-backup-${todayISO()}.csv`,
      csvText: buildCsvText(rows)
    };
  }

  function importBackupCsv(input = {}) {
    authGuard.ensureAuthorized(input?.authToken);
    const rows = parseCsvText(input.csvText);
    if (rows.length === 0) {
      throw new Error("CSV に取り込む行がありません。");
    }

    const hasScopedRows = rows.some((row) => String(row.record_scope || row.scope || "").trim());
    if (!hasScopedRows) {
      return importDailyCsv(input);
    }

    const now = new Date().toISOString();
    const currentCategories = categoryStore.listCategories({ includeInactive: true });
    const categoryMap = new Map(currentCategories.map((item) => [item.id, item]));

    rows.forEach((row) => {
      const categoryId = String(row.category_id || "").trim();
      if (!categoryId || categoryId === "other") {
        return;
      }
      const incomingCategory = {
        id: categoryId,
        nameJp: String(row.category_name_jp || row.category_name_en || row.category_name_de || categoryId).trim(),
        nameEn: String(row.category_name_en || row.category_name_jp || row.category_name_de || categoryId).trim(),
        nameDe: String(row.category_name_de || row.category_name_en || row.category_name_jp || categoryId).trim(),
        icon: String(row.category_icon || "🏷️").trim() || "🏷️",
        sortOrder: categoryMap.get(categoryId)?.sortOrder || (categoryMap.size + 1) * 10,
        isActive: 1,
        updatedAt: String(row.updated_at || row.created_at || now)
      };
      const current = categoryMap.get(categoryId);
      if (!current || getTimestamp(incomingCategory.updatedAt) >= getTimestamp(current.updatedAt)) {
        categoryMap.set(categoryId, current ? { ...current, ...incomingCategory } : incomingCategory);
      }
    });

    const mergedCategories = Array.from(categoryMap.values()).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

    const currentRecurring = recurringStore.listRecurringItems();
    const currentRecurringContentKeys = new Set(currentRecurring.map((item) => getRecurringContentKey(item)));
    const seenRecurringContentKeys = new Set();
    const importedRecurring = rows
      .filter((row) => String(row.record_scope || row.scope || "").trim().toLowerCase() === "monthly")
      .map((row) => ({
        id: String(row.id || createSyncId()),
        type: String(row.type || "fee").trim() === "income" ? "income" : "fee",
        title: String(row.title || "").trim(),
        amount: Number(row.amount || 0),
        startMonth: String(row.start_month || "").trim(),
        endMonth: String(row.end_month || "").trim() || null,
        categoryId: String(row.type || "fee").trim() === "fee" ? String(row.category_id || "other").trim() || "other" : null,
        createdAt: String(row.created_at || row.updated_at || now),
        updatedAt: String(row.updated_at || row.created_at || now)
      }))
      .filter((item) => {
        if (!item.title || !item.startMonth) {
          return false;
        }
        const key = getRecurringContentKey(item);
        if (currentRecurringContentKeys.has(key) || seenRecurringContentKeys.has(key)) {
          return false;
        }
        seenRecurringContentKeys.add(key);
        return true;
      });

    const mergedRecurring = mergeByKey(
      currentRecurring,
      importedRecurring,
      (item) => String(item.id || ""),
      (item) => getTimestamp(item.updatedAt || item.createdAt)
    ).sort((a, b) => String(a.startMonth || "").localeCompare(String(b.startMonth || "")));

    const currentDailyEntries = db.prepare(`
      SELECT id, sync_id AS syncId, type, title, amount, entry_date AS entryDate,
             category_id AS categoryId, category, note, created_at AS createdAt, updated_at AS updatedAt
      FROM daily_entries
      ORDER BY id ASC
    `).all();

    const currentDailyContentKeys = new Set(currentDailyEntries.map((item) => getDailyContentKey(item)));
    const seenDailyContentKeys = new Set();

    const importedDailyEntries = rows
      .filter((row) => String(row.record_scope || row.scope || "").trim().toLowerCase() === "daily")
      .map((row, index) => ({
        id: Number.isInteger(Number(row.id)) ? Number(row.id) : currentDailyEntries.length + index + 1,
        syncId: String(row.sync_id || "").trim() || null,
        type: String(row.type || "fee").trim() === "income" ? "income" : "fee",
        title: String(row.title || "").trim(),
        amount: Number(row.amount || 0),
        entryDate: String(row.entry_date || "").trim(),
        categoryId: String(row.type || "fee").trim() === "fee" ? String(row.category_id || "other").trim() || "other" : null,
        category: String(row.type || "fee").trim() === "fee" ? String(row.category_name_en || row.category_name_jp || row.category_name_de || row.category_id || "Other") : null,
        note: String(row.note || "").trim() || null,
        createdAt: String(row.created_at || row.updated_at || now),
        updatedAt: String(row.updated_at || row.created_at || now)
      }))
      .filter((item) => {
        if (!item.title || !item.entryDate) {
          return false;
        }
        const key = getDailyContentKey(item);
        if (currentDailyContentKeys.has(key) || seenDailyContentKeys.has(key)) {
          return false;
        }
        seenDailyContentKeys.add(key);
        return true;
      });

    const mergedDailyEntries = mergeByKey(
      currentDailyEntries,
      importedDailyEntries,
      getDailyMergeKey,
      (item) => getTimestamp(item.updatedAt || item.createdAt)
    ).map((item, index) => ({
      ...item,
      id: index + 1,
      syncId: item.syncId || createSyncId(),
      updatedAt: item.updatedAt || item.createdAt || now,
      createdAt: item.createdAt || item.updatedAt || now
    }));

    const result = importSyncData({
      categories: mergedCategories,
      recurring: mergedRecurring,
      dailyEntries: mergedDailyEntries,
      inputLogs: listHistory({ limit: 10000, locale: "en" }).map((row, index) => ({
        id: index + 1,
        source: row.source,
        action: row.action,
        type: row.type,
        title: row.title,
        amount: row.amount,
        targetDate: row.targetDate,
        categoryId: row.categoryId,
        category: row.category || row.categoryDisplay || null,
        note: row.note,
        payloadJson: null,
        loggedAt: row.loggedAt
      }))
    });

    return {
      ...result,
      importedCount: importedDailyEntries.length + importedRecurring.length,
      skippedCount: rows.length - importedDailyEntries.length - importedRecurring.length
    };
  }

  return {
    exportBackupCsv,
    importBackupCsv
  };
}
