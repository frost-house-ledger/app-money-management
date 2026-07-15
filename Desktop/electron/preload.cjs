const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ledgerApi", {
  recurring: {
    add: (payload) => ipcRenderer.invoke("recurring:add", payload),
    update: (payload) => ipcRenderer.invoke("recurring:update", payload),
    delete: (payload) => ipcRenderer.invoke("recurring:delete", payload),
    list: () => ipcRenderer.invoke("recurring:list")
  },
  entry: {
    add: (payload) => ipcRenderer.invoke("entry:add", payload),
    delete: (payload) => ipcRenderer.invoke("entry:delete", payload),
    update: (payload) => ipcRenderer.invoke("entry:update", payload),
    list: (payload) => ipcRenderer.invoke("entry:list", payload),
    importCsv: (payload) => ipcRenderer.invoke("entry:importCsv", payload),
    exportCsv: (payload) => ipcRenderer.invoke("entry:exportCsv", payload)
  },
  category: {
    list: (payload) => ipcRenderer.invoke("category:list", payload),
    add: (payload) => ipcRenderer.invoke("category:add", payload),
    update: (payload) => ipcRenderer.invoke("category:update", payload),
    delete: (payload) => ipcRenderer.invoke("category:delete", payload),
    reorder: (payload) => ipcRenderer.invoke("category:reorder", payload)
  },
  history: {
    list: (payload) => ipcRenderer.invoke("history:list", payload)
  },
  summary: {
    month: (month) => ipcRenderer.invoke("summary:month", month),
    range: (payload) => ipcRenderer.invoke("summary:range", payload),
    categoryBreakdown: (payload) => ipcRenderer.invoke("summary:categoryBreakdown", payload),
    categoryTrend: (payload) => ipcRenderer.invoke("summary:categoryTrend", payload),
    cachePath: () => ipcRenderer.invoke("summary:cachePath")
  },
  targets: {
    get: (month) => ipcRenderer.invoke("targets:get", month),
    save: (payload) => ipcRenderer.invoke("targets:save", payload)
  },
  sync: {
    serverInfo: () => ipcRenderer.invoke("sync:serverInfo"),
    exportData: () => ipcRenderer.invoke("sync:export"),
    importData: (payload) => ipcRenderer.invoke("sync:import", payload)
  }
});

contextBridge.exposeInMainWorld("exchangeRatesApi", {
  fetch: () => ipcRenderer.invoke("exchange-rates:fetch")
});

contextBridge.exposeInMainWorld("shellApi", {
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url)
});
