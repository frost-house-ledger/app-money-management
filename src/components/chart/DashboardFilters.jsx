import React from "react";
import { logError } from "../../lib/logger.js";

export default function DashboardFilters({
  range,
  setRange,
  selectedDailyCategory,
  setSelectedDailyCategory,
  dailyCategoryOptions,
  t
}) {
  try {
    const safeDailyCategoryOptions = Array.isArray(dailyCategoryOptions) ? dailyCategoryOptions : [];
    const safeRange = range || {};

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
            {safeDailyCategoryOptions.map((category) => (
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
            value={safeRange.fromMonth}
            onChange={(e) => setRange((curr) => ({ ...curr, fromMonth: e.target.value }))}
          />
        </label>

        {/* "to" month. This is optional. If not set, the chart will show all months from the "from" month until the latest month with data. */}
        <label>
          {t.chartToLabel}
          <input
            type="month"
            value={safeRange.toMonth}
            onChange={(e) => setRange((curr) => ({ ...curr, toMonth: e.target.value }))}
          />
        </label>
      </section>
    );
  } catch (err) {
    logError("DashboardFilters.render", err);
    return (
      <section className="toolbar card">
        <p className="error">{t?.errorUnexpectedMessage || "An unexpected error occurred while displaying the dashboard filters."}</p>
      </section>
    );
  }
}
