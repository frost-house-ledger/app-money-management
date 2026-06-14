/**
 * Electron adapter — thin wrapper around window.ledgerApi (contextBridge).
 * All operations are already handled by the Node.js backend in Desktop/electron/.
 */
export function createElectronApi() {
  return {
    entry: {
      add: (payload) => window.ledgerApi.entry.add(payload),
      update: (payload) => window.ledgerApi.entry.update(payload),
      delete: (payload) => window.ledgerApi.entry.delete(payload),
      list: (payload) => window.ledgerApi.entry.list(payload),
      importCsv: (payload) => window.ledgerApi.entry.importCsv(payload),
      exportCsv: (payload) => window.ledgerApi.entry.exportCsv(payload)
    },
    category: {
      list: (payload) => window.ledgerApi.category.list(payload),
      add: (payload) => window.ledgerApi.category.add(payload),
      update: (payload) => window.ledgerApi.category.update(payload),
      delete: (payload) => window.ledgerApi.category.delete(payload),
      reorder: (payload) => window.ledgerApi.category.reorder(payload)
    },
    recurring: {
      list: () => window.ledgerApi.recurring.list(),
      add: (payload) => window.ledgerApi.recurring.add(payload),
      update: (payload) => window.ledgerApi.recurring.update(payload),
      delete: (payload) => window.ledgerApi.recurring.delete(payload)
    },
    history: {
      list: (payload) => window.ledgerApi.history.list(payload)
    },
    summary: {
      month: (payload) => window.ledgerApi.summary.month(payload),
      range: (payload) => window.ledgerApi.summary.range(payload),
      categoryBreakdown: (payload) => window.ledgerApi.summary.categoryBreakdown(payload),
      categoryTrend: (payload) => window.ledgerApi.summary.categoryTrend(payload),
      cachePath: () => window.ledgerApi.summary.cachePath()
    },
    targets: {
      get: (month) => window.ledgerApi.targets.get(month),
      save: (payload) => window.ledgerApi.targets.save(payload)
    },
    sync: {
      serverInfo: (_payload) => window.ledgerApi.sync.serverInfo(),
      exportData: () => window.ledgerApi.sync.exportData(),
      importData: (payload) => window.ledgerApi.sync.importData(payload),
      syncNow: async () => ({ ok: true, mode: "desktop-server" })
    }
  };
}
