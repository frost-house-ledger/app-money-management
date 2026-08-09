export function validateType(type) {
  if (type !== "fee" && type !== "income" && type !== "investment") {
    throw new Error("type must be 'fee', 'income', or 'investment'.");
  }
}

export function validateMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("month must be in YYYY-MM format.");
  }
}

export function validateDate(entryDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    throw new Error("entryDate must be in YYYY-MM-DD format.");
  }
}

export function ensureAmount(amount) {
  if (typeof amount !== "number" || Number.isNaN(amount) || amount < 0) {
    throw new Error("amount must be a number greater than or equal to 0.");
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
    throw new Error("fromDate must be less than or equal to toDate.");
  }
}

export function normalizeCategoryId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf-]/g, "");
}
