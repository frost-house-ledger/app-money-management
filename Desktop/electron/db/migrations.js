export function runStoreMigrations({
  categoryStore,
  recurringStore,
  rebuildMonthlyJsonCache
}) {
  categoryStore.ensureDefaultCategories();
  categoryStore.migrateLegacyDailyCategories();
  recurringStore.migrateRecurringItemsToJson();

  return {
    initialCachePath: rebuildMonthlyJsonCache()
  };
}
