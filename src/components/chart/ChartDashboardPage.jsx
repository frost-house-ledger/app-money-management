import React from "react";
import DashboardFilters from "./DashboardFilters.jsx";
import SummaryCards from "./SummaryCards.jsx";
import MonthlyChart from "./MonthlyChart.jsx";
import { logError } from "../../lib/logger.js";

export default function ChartDashboardPage({
  selectedMonth,
  setSelectedMonth,
  selectedCurrency,
  exchangeRates,
  range,
  setRange,
  selectedDailyCategory,
  setSelectedDailyCategory,
  dailyCategoryOptions,
  monthlySummary,
  monthlyRows,
  t
}) {
  try {
    const safeMonthlyRows = Array.isArray(monthlyRows) ? monthlyRows : [];
    const safeRange = range || {};
    const safeDailyCategoryOptions = Array.isArray(dailyCategoryOptions) ? dailyCategoryOptions : [];

    return (
      <section className="chart-dashboard-page">
        <DashboardFilters
          range={safeRange}
          setRange={setRange}
          selectedDailyCategory={selectedDailyCategory}
          setSelectedDailyCategory={setSelectedDailyCategory}
          dailyCategoryOptions={safeDailyCategoryOptions}
          t={t}
        />
        {/* Debug: show currently selected category (temporary) */}
        <div style={{ color: "#aec0d4", fontSize: "0.9rem", margin: "6px 0" }}>selectedDailyCategory: {String(selectedDailyCategory)}</div>

        <SummaryCards monthlySummary={monthlySummary} selectedCurrency={selectedCurrency} exchangeRates={exchangeRates} selectedDailyCategory={selectedDailyCategory} t={t} />

        <section className="card chart-card">
          <h2>{t.monthlyChartTitle}</h2>
          {safeRange && safeRange.fromMonth && safeRange.toMonth && safeRange.fromMonth > safeRange.toMonth ? (
            <p className="error">{t.chartRangeInvalid}</p>
          ) : (
            <MonthlyChart
              rows={safeMonthlyRows}
              currencyCode={selectedCurrency}
              exchangeRates={exchangeRates}
              selectedDailyCategory={selectedDailyCategory}
            />
          )}
        </section>
      </section>
    );
  } catch (err) {
    logError("ChartDashboardPage.render", err);
    return (
      <section className="chart-dashboard-page">
        <p className="error">{t?.errorUnexpectedMessage || "予期しないエラーが発生しました。"}</p>
      </section>
    );
  }
}
