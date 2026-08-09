import { matchesEntryFilter } from "../../src/lib/entryFilters.js";

describe("matchesEntryFilter", () => {
  const row = {
    title: "Grocery store",
    note: "Weekly food",
    categoryId: "food",
    amount: 3200,
    entryDate: "2026-04-12"
  };

  test("matches text, category, amount and period together", () => {
    expect(matchesEntryFilter(row, {
      query: "weekly",
      categoryId: "food",
      minAmountBase: 3000,
      maxAmountBase: 4000,
      fromDate: "2026-04-01",
      toDate: "2026-04-30"
    })).toBe(true);
  });

  test("rejects rows outside the requested range", () => {
    expect(matchesEntryFilter(row, { query: "rent", categoryId: "all" })).toBe(false);
    expect(matchesEntryFilter(row, { minAmountBase: 4000, categoryId: "all" })).toBe(false);
    expect(matchesEntryFilter(row, { fromDate: "2026-05-01", categoryId: "all" })).toBe(false);
  });

  test("uses the first day of a recurring month for period matching", () => {
    expect(matchesEntryFilter({ ...row, startMonth: "2026-04", entryDate: undefined }, {
      fromDate: "2026-04-01",
      toDate: "2026-04-30"
    })).toBe(true);
  });
});
