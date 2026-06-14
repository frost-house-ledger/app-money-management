import path from "node:path";
import os from "node:os";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain, net } from "electron";
import { createLedgerStore } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
let mainWindow = null;
let syncServer = null;
const SYNC_PORT = 30303;

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

  ipcMain.handle("recurring:add", async (_event, payload) => {
    return ledger.addRecurring(payload);
  });

  ipcMain.handle("recurring:update", async (_event, payload) => {
    return ledger.updateRecurring(payload);
  });

  ipcMain.handle("recurring:delete", async (_event, payload) => {
    return ledger.deleteRecurring(payload);
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

  ipcMain.handle("entry:importCsv", async (_event, payload) => ledger.importBackupCsv(payload || {}));

  ipcMain.handle("entry:exportCsv", async (_event, payload) => ledger.exportBackupCsv(payload || {}));

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

  ipcMain.handle("targets:get", async (_event, month) => {
    return ledger.getCategoryTargets(month);
  });

  ipcMain.handle("targets:save", async (_event, payload) => {
    return ledger.saveCategoryTargets(payload || {});
  });

  ipcMain.handle("exchange-rates:fetch", () => fetchExchangeRates());

  ipcMain.handle("sync:serverInfo", () => {
    return {
      running: Boolean(syncServer?.listening),
      port: SYNC_PORT,
      urls: getLanUrls(SYNC_PORT)
    };
  });

  ipcMain.handle("sync:export", () => ledger.exportSyncData());

  ipcMain.handle("sync:import", (_event, payload) => ledger.importSyncData(payload || {}));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (isDev) {
    await mainWindow.loadURL("http://localhost:5173");
  } else {
    await mainWindow.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
  }

}

function getLanUrls(port) {
  const interfaces = os.networkInterfaces();
  const urls = [];
  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.internal || entry.family !== "IPv4") {
        return;
      }
      urls.push(`http://${entry.address}:${port}`);
    });
  });
  return Array.from(new Set(urls));
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += String(chunk);
      if (raw.length > 8 * 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function startSyncServer(ledger) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS") {
      writeJson(res, 200, { ok: true });
      return;
    }

    try {
      if (req.method === "GET" && url.pathname === "/sync/ping") {
        writeJson(res, 200, {
          ok: true,
          app: "MoneyManagement",
          version: app.getVersion(),
          now: new Date().toISOString(),
          urls: getLanUrls(SYNC_PORT)
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/sync/export") {
        writeJson(res, 200, ledger.exportSyncData());
        return;
      }

      if (req.method === "POST" && url.pathname === "/sync/import") {
        const payload = await readJsonBody(req);
        const result = ledger.importSyncData(payload);
        writeJson(res, 200, result);
        return;
      }

      writeJson(res, 404, { ok: false, error: "Not found" });
    } catch (error) {
      writeJson(res, 500, { ok: false, error: error?.message || "Sync server error" });
    }
  });

  server.listen(SYNC_PORT, "0.0.0.0");
  return server;
}

app.whenReady().then(() => {
  const dataDir = app.getPath("userData");
  const ledger = createLedgerStore(dataDir);
  syncServer = startSyncServer(ledger);

  createMainWindow(ledger);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow(ledger);
    }
  });
});

app.on("window-all-closed", () => {
  if (syncServer) {
    syncServer.close();
    syncServer = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
