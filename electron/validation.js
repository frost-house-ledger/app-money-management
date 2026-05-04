export function validateType(type) {
  if (type !== "fee" && type !== "income") {
    throw new Error("type は fee または income を指定してください。");
  }
}

export function validateMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("month は YYYY-MM 形式で指定してください。");
  }
}

export function validateDate(entryDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    throw new Error("entryDate は YYYY-MM-DD 形式で指定してください。");
  }
}

export function ensureAmount(amount) {
  if (typeof amount !== "number" || Number.isNaN(amount) || amount < 0) {
    throw new Error("amount には 0 以上の数値を指定してください。");
  }
}

export function validateDateRange(fromDate, toDate) {
  if (fromDate) {
    validateDate(fromDate);
  }
  if (toDate) {
    validateDate(toDate);
  }
  if (!fromDate || !toDate) {
    return;
  }
  if (fromDate > toDate) {
    throw new Error("fromDate は toDate 以下にしてください。");
  }
}

export function normalizeCategoryId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf-]/g, "");
}
