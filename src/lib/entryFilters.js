export const EMPTY_ENTRY_FILTER = {
  query: "",
  categoryId: "all",
  minAmount: "",
  maxAmount: "",
  fromDate: "",
  toDate: ""
};

function normaliseText(value) {
  return String(value || "").trim().toLowerCase();
}

export function matchesEntryFilter(row, filter = EMPTY_ENTRY_FILTER, options = {}) {
  const query = normaliseText(filter.query);
  const categoryId = String(filter.categoryId || "all");
  const searchableText = [
    row.title,
    row.note,
    row.categoryId,
    row.categoryDisplay,
    row.type
  ].map(normaliseText).join(" ");
  const amount = Number(row.amount || 0);
  const rawDate = String(row.entryDate || row.targetDate || (row.startMonth ? `${row.startMonth}-01` : ""));
  const date = /^\d{4}-\d{2}$/.test(rawDate) ? `${rawDate}-01` : rawDate;
  const fromDate = String(filter.fromDate || "");
  const toDate = String(filter.toDate || "");
  const minAmount = filter.minAmountBase === "" || filter.minAmountBase == null
    ? null
    : Number(filter.minAmountBase);
  const maxAmount = filter.maxAmountBase === "" || filter.maxAmountBase == null
    ? null
    : Number(filter.maxAmountBase);

  if (query && !searchableText.includes(query)) return false;
  if (categoryId !== "all" && String(row.categoryId || "") !== categoryId) return false;
  if (minAmount !== null && Number.isFinite(minAmount) && amount < minAmount) return false;
  if (maxAmount !== null && Number.isFinite(maxAmount) && amount > maxAmount) return false;
  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;
  return true;
}
