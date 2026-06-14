import React from "react";

export default function DashboardFilters({
  range,
  setRange,
  dateRange,
  setDateRange,
  selectedDailyCategory,
  setSelectedDailyCategory,
  dailyCategoryOptions,
  t
}) {
  return (
    <section className="toolbar card">
      {/* Removed filter-type control — showing all types by default. */}

      {/* Daily category filter controls which daily records are included in totals and lists. */}
      <label>
        {t.dailyCategoryLabel}
        <select
          value={selectedDailyCategory}
          onChange={(e) => setSelectedDailyCategory(e.target.value)}
        >
          <option value="all">{t.allCategories}</option>
          {dailyCategoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon || "🏷️"} {category.label}
            </option>
          ))}
        </select>
      </label>

      {/* "from month" */}
      <label>
        {t.chartFromLabel}
        <input
          type="month"
          value={range.fromMonth}
          onChange={(e) => setRange((curr) => ({ ...curr, fromMonth: e.target.value }))}
        />
      </label>

      {/* "to" month. This is optional. If not set, the chart will show all months from the "from" month until the latest month with data. */}
      <label>
        {t.chartToLabel}
        <input
          type="month"
          value={range.toMonth}
          onChange={(e) => setRange((curr) => ({ ...curr, toMonth: e.target.value }))}
        />
      </label>

      {/* Date range filters which daily records are included in totals and lists. */}
      <label>
        {t.dateRangeFromLabel}
        <input
          type="date"
          value={dateRange.fromDate}
          onChange={(e) => setDateRange((curr) => ({ ...curr, fromDate: e.target.value }))}
        />
      </label>
      {/* The "to" date filter is optional. If not set, all daily records from the "from" date until today will be included. */}
      <label>
        {t.dateRangeToLabel}
        <input
          type="date"
          value={dateRange.toDate}
          onChange={(e) => setDateRange((curr) => ({ ...curr, toDate: e.target.value }))}
        />
      </label>
    </section>
  );
}
