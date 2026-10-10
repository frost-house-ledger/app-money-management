export function isRecurringActiveInMonth(item, month) {
  const startMonth = String(item?.startMonth || "");
  const endMonth = item?.endMonth || null;
  const inDateRange = startMonth <= month && (!endMonth || month <= endMonth);
  if (!inDateRange) {
    return false;
  }
  const frequency = String(item?.frequency || "monthly").trim().toLowerCase();
  if (frequency !== "annual" && frequency !== "yearly") {
    return true;
  }
  return startMonth.slice(5, 7) === month.slice(5, 7);
}
