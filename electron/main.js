import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain, net } from "electron";
import { createLedgerStore } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
let mainWindow = null;

// Exchange rates — in-memory cache (cleared on app restart, TTL 24 h)
let _erCache = null;
let _erCacheTs = 0;
const ER_CACHE_TTL = 24 * 60 * 60 * 1000;
const ER_API_URL = "https://open.er-api.com/v6/latest/JPY";
const ER_TIMEOUT_MS = 8000;
const ER_RETRIES = 2;

async function fetchExchangeRates() {
  if (_erCache && Date.now() - _erCacheTs < ER_CACHE_TTL) {
    return _erCache;
  }
  for (let attempt = 0; attempt <= ER_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ER_TIMEOUT_MS);
    try {
      const res = await net.fetch(ER_API_URL, { signal: controller.signal });
      clearTimeout(timer);
      const data = await res.json();
      if (data.result === "success") {
        _erCache = data.rates;
        _erCacheTs = Date.now();
        return data.rates;
      }
    } catch {
      clearTimeout(timer);
      if (attempt === ER_RETRIES) return null;
    }
  }
  return null;
}

async function createMainWindow(ledger) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: "家計簿アプリ",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    await mainWindow.loadURL("http://localhost:5173");
  } else {
    await mainWindow.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
  }

  ipcMain.handle("recurring:add", async (_event, payload) => {
    return ledger.addRecurring(payload);
  });

  ipcMain.handle("recurring:update", async (_event, payload) => {
    return ledger.updateRecurring(payload);
  });

  ipcMain.handle("recurring:list", async () => ledger.listRecurring());

  ipcMain.handle("entry:add", async (_event, payload) => {
    return ledger.addDailyEntry(payload);
  });

  ipcMain.handle("entry:delete", async (_event, payload) => {
    return ledger.deleteDaily(payload);
  });

  ipcMain.handle("entry:update", async (_event, payload) => {
    return ledger.updateDaily(payload);
  });

  ipcMain.handle("entry:list", async (_event, payload) => ledger.listDaily(payload));

  ipcMain.handle("entry:importCsv", async (_event, payload) => ledger.importDailyCsv(payload || {}));

  ipcMain.handle("history:list", async (_event, payload) => ledger.listHistory(payload || {}));

  ipcMain.handle("category:list", async (_event, payload) => ledger.listCategories(payload || {}));

  ipcMain.handle("category:add", async (_event, payload) => ledger.addCategory(payload));

  ipcMain.handle("category:update", async (_event, payload) => ledger.updateCategory(payload));

  ipcMain.handle("category:delete", async (_event, payload) => ledger.deleteCategory(payload));

  ipcMain.handle("category:reorder", async (_event, payload) => ledger.reorderCategories(payload));

  ipcMain.handle("summary:month", async (_event, payload) => {
    if (typeof payload === "string") {
      return ledger.getMonthSummary(payload);
    }
    const { month, categoryId, fromDate, toDate } = payload || {};
    return ledger.getMonthSummary(month, { categoryId, fromDate, toDate });
  });

  ipcMain.handle("summary:range", async (_event, payload) => {
    const { fromMonth, toMonth, categoryId, fromDate, toDate } = payload || {};
    return ledger.getMonthRangeSummary(fromMonth, toMonth, { categoryId, fromDate, toDate });
  });

  ipcMain.handle("summary:categoryBreakdown", async (_event, payload) => {
    return ledger.getCategoryBreakdown(payload || {});
  });

  ipcMain.handle("summary:categoryTrend", async (_event, payload) => {
    return ledger.getCategoryTrend(payload || {});
  });

  ipcMain.handle("summary:cachePath", async () => ledger.rebuildMonthlyJsonCache());

  ipcMain.handle("exchange-rates:fetch", () => fetchExchangeRates());

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

}

app.whenReady().then(() => {
  const dataDir = app.getPath("userData");
  const ledger = createLedgerStore(dataDir);

  createMainWindow(ledger);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(ledger);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
