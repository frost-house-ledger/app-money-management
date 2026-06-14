import React from "react";
import DashboardFilters from "./DashboardFilters.jsx";
import SummaryCards from "./SummaryCards.jsx";
import MonthlyChart from "./MonthlyChart.jsx";

export default function ChartDashboardPage({
  selectedMonth,
  setSelectedMonth,
  filterType,
  setFilterType,
  selectedCurrency,
  exchangeRates,
  range,
  setRange,
  dateRange,
  setDateRange,
  selectedDailyCategory,
  setSelectedDailyCategory,
  dailyCategoryOptions,
  monthlySummary,
  monthlyRows,
  t
}) {
  return (
    <section className="chart-dashboard-page">
      <DashboardFilters

        filterType={filterType}
        setFilterType={setFilterType}
        range={range}
        setRange={setRange}
        dateRange={dateRange}
        setDateRange={setDateRange}
        selectedDailyCategory={selectedDailyCategory}
        setSelectedDailyCategory={setSelectedDailyCategory}
        dailyCategoryOptions={dailyCategoryOptions}
        t={t}
      />

      <SummaryCards monthlySummary={monthlySummary} selectedCurrency={selectedCurrency} exchangeRates={exchangeRates} t={t} />

      <section className="card chart-card">
        <h2>{t.monthlyChartTitle}</h2>
        {range && range.fromMonth && range.toMonth && range.fromMonth > range.toMonth ? (
          <p className="error">{t.chartRangeInvalid || "グラフ開始月がグラフ終了月より後になっています"}</p>
        ) : (
          <MonthlyChart
            rows={monthlyRows}
            filterType={filterType}
            currencyCode={selectedCurrency}
            exchangeRates={exchangeRates}
          />
        )}
      </section>
    </section>
  );
}
