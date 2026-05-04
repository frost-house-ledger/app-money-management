export function buildEntryListPayload({ month, filterType, selectedDailyCategory, dateRange, locale }) {
  const payload = { month, type: filterType, locale };

  if (selectedDailyCategory !== "all") {
    payload.categoryId = selectedDailyCategory;
  }

  if (dateRange.fromDate) {
    payload.fromDate = dateRange.fromDate;
  }

  if (dateRange.toDate) {
    payload.toDate = dateRange.toDate;
  }

  return payload;
}

export function buildSummaryMonthPayload({ month, selectedDailyCategory, dateRange }) {
  const payload = { month };

  if (selectedDailyCategory !== "all") {
    payload.categoryId = selectedDailyCategory;
  }

  if (dateRange.fromDate) {
    payload.fromDate = dateRange.fromDate;
  }

  if (dateRange.toDate) {
    payload.toDate = dateRange.toDate;
  }

  return payload;
}

export function buildSummaryRangePayload({ fromMonth, toMonth, selectedDailyCategory, dateRange }) {
  const payload = { fromMonth, toMonth };

  if (selectedDailyCategory !== "all") {
    payload.categoryId = selectedDailyCategory;
  }

  if (dateRange.fromDate) {
    payload.fromDate = dateRange.fromDate;
  }

  if (dateRange.toDate) {
    payload.toDate = dateRange.toDate;
  }

  return payload;
}
