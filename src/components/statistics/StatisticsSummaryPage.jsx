import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import { formatCurrency } from "../../lib/currency.js";
import SavingsSimulationPanel from "./SavingsSimulationPanel.jsx";
import { logError } from "../../lib/logger.js";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  BarController,
} from "chart.js";

import { Bar } from "react-chartjs-2";
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, BarController);


function formatDelta(value, currency, rates) {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(amount), currency, rates)}`;
}

export default function StatisticsSummaryPage({ selectedMonth, selectedCurrency, exchangeRates, t, currentBalance, currentBalanceDate }) {
  const fallbackYear = String(new Date().getFullYear());
  const year = /^\d{4}-\d{2}$/.test(selectedMonth || "") ? selectedMonth.slice(0, 4) : fallbackYear;
  const [rows, setRows] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [showSimulation, setShowSimulation] = useState(false);
  const [dailyEntries, setDailyEntries] = useState([]);
  const [recurringItems, setRecurringItems] = useState([]);
  const [dailyLoadState, setDailyLoadState] = useState("loading");
  const [monthlyTableOpen, setMonthlyTableOpen] = useState(true);
  const [dailyTableOpen, setDailyTableOpen] = useState(true);
  const standaloneBalance = currentBalance === undefined;
  const [legacyBalance] = useState(() => localStorage.getItem("analysis:currentBalance") || "");
  const balanceValue = standaloneBalance ? legacyBalance : currentBalance;


  async function loadAnnualSummary() {
    const fromMonth = `${year}-01`;
    const toMonth = `${year}-12`;
    setLoadState("loading");
    setLoadError("");
    try {
      const result = await api.summary.range({ fromMonth, toMonth });
      setRows(Array.isArray(result) ? result : []);
      setLoadState("ready");
    } catch (err) {
      logError("StatisticsSummaryPage.load", err);
      setRows([]);
      setLoadError(t?.errorLoadFailed || "Failed to load statistics.");
      setLoadState("error");
    }
  }

  async function loadAnnualDailyEntries() {
    setDailyLoadState("loading");
    if (!api?.entry?.list || !api?.recurring?.list) {
      setDailyEntries([]);
      setRecurringItems([]);
      setDailyLoadState("ready");
      return;
    }
    try {
      const months = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
      const [entryResults, recurringResult] = await Promise.all([
        Promise.all(months.map((month) => api.entry.list({ month }))),
        api.recurring.list()
      ]);
      setDailyEntries(entryResults.flatMap((result) => Array.isArray(result) ? result : []));
      setRecurringItems(Array.isArray(recurringResult) ? recurringResult : []);
      setDailyLoadState("ready");
    } catch (err) {
      logError("StatisticsSummaryPage.loadDailyEntries", err);
      setDailyEntries([]);
      setRecurringItems([]);
      setDailyLoadState("error");
    }
  }

  useEffect(() => {
    loadAnnualSummary();
    loadAnnualDailyEntries();
  }, [year]);
  const safeRows = Array.isArray(rows) ? rows : [];

  const rowsWithDiff = useMemo(() => {
    try {
      return safeRows.map((row, index) => {
        if (index === 0) {
          return { ...row, diffFromPrevious: null };
        }
        const prev = safeRows[index - 1];
        return {
          ...row,
          diffFromPrevious: Number(row.balance || 0) - Number(prev.balance || 0)
        };
      });
    } catch (err) {
      logError("StatisticsSummaryPage.rowsWithDiff", err);
      return [];
    }
  }, [safeRows]);

  // Derived net-series for the monthly summary (labels, per-month net, cumulative net)
  const rowsNetSeries = useMemo(() => {
    try {
      const labels = (rowsWithDiff || []).map((r) => r.month || "");
      const net = (rowsWithDiff || []).map((r) => Number(r.income || 0) - Number(r.fee || 0));
      const cumulative = [];
      let running = 0;
      for (const n of net) {
        running += n;
        cumulative.push(running);
      }
      return { labels, net, cumulative };
    } catch (e) {
      logError('StatisticsSummaryPage.rowsNetSeries', e);
      return { labels: [], net: [], cumulative: [] };
    }
  }, [rowsWithDiff]);

  // Treat the entered balance as the value at the selected date's month.
  const cumulativeNetWithBaseline = (() => {
    try {
      const base = Number(balanceValue || 0);
      const cum = Array.isArray(rowsNetSeries.cumulative) ? rowsNetSeries.cumulative.slice() : [];
      const labels = Array.isArray(rowsNetSeries.labels) ? rowsNetSeries.labels : [];
      if (labels.length === 0) return [];
      const baselineMonth = String(currentBalanceDate || "").slice(0, 7);
      const baselineIndex = Math.max(0, labels.findIndex((label) => label === baselineMonth));
      return labels.map((_, i) => {
        if (i < baselineIndex) return 0;
        return base + (cum[i - 1] || 0) - (cum[baselineIndex - 1] || 0);
      });
    } catch (e) {
      return Array.isArray(rowsNetSeries.cumulative) ? rowsNetSeries.cumulative : [];
    }
  })();

  const dailyBalanceRows = useMemo(() => {
    try {
      const baselineDate = String(currentBalanceDate || "");
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      const startDate = baselineDate >= yearStart && baselineDate <= yearEnd ? baselineDate : yearStart;
      const entriesByDate = new Map();
      for (const entry of dailyEntries) {
        const date = String(entry.entryDate || "");
        if (date < startDate || date > yearEnd) continue;
        const net = entry.type === "income" ? Number(entry.amount || 0) : entry.type === "fee" ? -Number(entry.amount || 0) : 0;
        entriesByDate.set(date, (entriesByDate.get(date) || 0) + net);
      }

      const recurringByMonth = new Map();
      for (let monthIndex = 1; monthIndex <= 12; monthIndex += 1) {
        const month = `${year}-${String(monthIndex).padStart(2, "0")}`;
        const monthTotal = recurringItems
          .filter((item) => item.startMonth <= month && (!item.endMonth || month <= item.endMonth))
          .reduce((total, item) => {
            const net = item.type === "income" ? Number(item.amount || 0) : item.type === "fee" ? -Number(item.amount || 0) : 0;
            return total + net;
          }, 0);
        recurringByMonth.set(month, monthTotal);
      }

      const rowsForDays = [];
      let running = Number(balanceValue || 0);
      for (let date = new Date(`${startDate}T00:00:00`); date <= new Date(`${yearEnd}T00:00:00`); date.setDate(date.getDate() + 1)) {
        const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const month = isoDate.slice(0, 7);
        const net = (date.getDate() === 1 ? recurringByMonth.get(month) || 0 : 0) + (entriesByDate.get(isoDate) || 0);
        running += net;
        rowsForDays.push({ date: isoDate, net, balance: running });
      }
      return rowsForDays;
    } catch (err) {
      logError("StatisticsSummaryPage.dailyBalanceRows", err);
      return [];
    }
  }, [balanceValue, currentBalanceDate, dailyEntries, recurringItems, year]);

  try {
    return (
    /* Renders the annual summary page, including a header with the year selector, total balance, and a button to toggle the savings simulation panel. Also displays a list of monthly summaries with income, fee, balance, and difference from the previous month. */
    <section className="chart-dashboard-page">

      {/* Statistics summary when simulation is not shown */}
      {!showSimulation && (
        <section className="chart-dashboard-page">

          {/* Statistics summary when simulation is not shown */}
            <button type="button" className="statistics-collapse-button" onClick={() => setMonthlyTableOpen((open) => !open)}>
              {monthlyTableOpen ? "-" : "+"} {t.monthlySummaryGraphTitle || "Monthly summary"}
            </button>
            {standaloneBalance && legacyBalance && (
              <div className="saved-balance-value">Saved value: {formatCurrency(Number(legacyBalance), selectedCurrency, exchangeRates)}</div>
            )}
            {monthlyTableOpen && <>

            <div style={{ height: 300, marginTop: 12 }}>
              {loadState === "loading" ? (
                <div className="subtext">{t.loadingLabel || "Loading..."}</div>
              ) : loadState === "error" ? (
                <div className="error" role="alert">
                  <p>{loadError}</p>
                  <button type="button" className="secondary-button" onClick={loadAnnualSummary}>
                    {t.actionRetry || "Retry"}
                  </button>
                </div>
              ) : rowsWithDiff && rowsWithDiff.length > 0 ? (
                <Bar
                  data={{
                    labels: rowsWithDiff.map((r) => r.month),
                    datasets: [
                      {
                        type: "bar",
                        label: t.summaryIncome,
                        data: rowsWithDiff.map((r) => Number(r.income || 0)),
                        backgroundColor: "rgba(34,197,94,0.6)",
                        yAxisID: "y",
                      },
                      {
                        type: "bar",
                        label: t.summaryFee,
                        data: rowsWithDiff.map((r) => Number(r.fee || 0)),
                        backgroundColor: "rgba(239,68,68,0.6)",
                        yAxisID: "y",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                      legend: { position: 'top', align: 'end', labels: { color: '#9fb0d0' } },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => {
                            const v = ctx.parsed && (ctx.parsed.y ?? ctx.parsed);
                            return formatCurrency(Number(v || 0), selectedCurrency, exchangeRates);
                          }
                        }
                      }
                    },
                    scales: {
                      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#9fb0d0' } },
                      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#9fb0d0' } },
                    },
                  }}
                />
              ) : (
                <div className="subtext">No data available to display.</div>
              )}
            </div>

            <br />

            <br />

            <table className="app-table">
              <thead>
                <tr>
                  <th>{t.monthLabel}</th>
                  <th>{t.summaryIncome}</th>
                  <th>{t.summaryFee}</th>
                  <th>{t.summaryBalance}</th>
                  <th>{t.monthComparisonLabel}</th>
                  <th>{t.cumulativeLabel || "Cumulative"}</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithDiff.map((row, index) => {
                  const cumulative = cumulativeNetWithBaseline[index] || 0;
                  return (
                    <tr key={row.month}>
                      <td><strong>{row.month}</strong></td>
                      <td>{formatCurrency(row.income, selectedCurrency, exchangeRates)}</td>
                      <td>{formatCurrency(row.fee, selectedCurrency, exchangeRates)}</td>
                      <td>{formatCurrency(row.balance, selectedCurrency, exchangeRates)}</td>
                      <td
                        className={
                          row.diffFromPrevious == null
                            ? "month-diff"
                            : row.diffFromPrevious >= 0
                              ? "month-diff positive"
                              : "month-diff negative"
                        }
                      >
                        {row.diffFromPrevious == null ? "-" : formatDelta(row.diffFromPrevious, selectedCurrency, exchangeRates)}
                      </td>
                      <td className={cumulative >= 0 ? "positive" : "negative"}>
                        {formatDelta(cumulative, selectedCurrency, exchangeRates)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </>}

            <button type="button" className="statistics-collapse-button" onClick={() => setDailyTableOpen((open) => !open)}>
              {dailyTableOpen ? "-" : "+"} {t.dailyBalanceTrendTitle || "Daily balance trend"}
            </button>
            {dailyTableOpen && (
              dailyLoadState === "loading" ? (
                <div className="subtext">{t.loadingLabel || "Loading..."}</div>
              ) : dailyLoadState === "error" ? (
                <div className="error" role="alert">{t.errorLoadFailed || "Failed to load daily statistics."}</div>
              ) : (
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>{t.dateLabel || "Date"}</th>
                      <th>{t.summaryBalance || "Balance"}</th>
                      <th>{t.cumulativeLabel || "Cumulative"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyBalanceRows.map((row) => (
                      <tr key={row.date}>
                        <td><strong>{row.date}</strong></td>
                        <td className={row.net >= 0 ? "positive" : "negative"}>{formatDelta(row.net, selectedCurrency, exchangeRates)}</td>
                        <td className={row.balance >= 0 ? "positive" : "negative"}>{formatCurrency(row.balance, selectedCurrency, exchangeRates)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
            </section>
          )}

          {/* Simulation button / panel toggle */}
          {showSimulation ? (
            <>
              <SavingsSimulationPanel
                annualRows={rows}
                selectedCurrency={selectedCurrency}
                exchangeRates={exchangeRates}
                t={t}
              />

              <button
                type="button"
                className={`secondary-button savings-sim-toggle inactive`}
                onClick={() => setShowSimulation(false)}
              >
                Cancel Simulation
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`secondary-button savings-sim-toggle ${showSimulation ? "active" : ""}`}
                onClick={() => setShowSimulation((v) => !v)}
              >
                {t.savingsSimButtonLabel}
              </button>
            </>
          )}
      </section>
    );
  } catch (err) {
    logError("StatisticsSummaryPage.render", err);
    return (
      <section className="chart-dashboard-page">
        <p className="error">{t?.errorUnexpectedMessage || "An unexpected error occurred while displaying the annual summary page."}</p>
      </section>
    );
  }
}
