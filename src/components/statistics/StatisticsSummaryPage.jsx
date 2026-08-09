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

export default function StatisticsSummaryPage({ selectedMonth, selectedCurrency, exchangeRates, t }) {
  const fallbackYear = String(new Date().getFullYear());
  const year = /^\d{4}-\d{2}$/.test(selectedMonth || "") ? selectedMonth.slice(0, 4) : fallbackYear;
  const [rows, setRows] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [showSimulation, setShowSimulation] = useState(false);

  const [currentBalance, setCurrentBalance] = useState("");
  const [currentBalanceRaw, setCurrentBalanceRaw] = useState("");

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

  useEffect(() => {
    loadAnnualSummary();
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

  useEffect(() => {
    try {
      const key = `analysis:currentBalance`;
      const saved = localStorage.getItem(key);
      if (saved !== null) setCurrentBalance(saved);
    } catch (e) {
      logError("StatisticsSummaryPage.loadCurrentBalance", e);
    }
  }, []);

  useEffect(() => {
    if (currentBalance === "") {
      setCurrentBalanceRaw("");
      return;
    }
    setCurrentBalanceRaw(formatCurrency(Number(currentBalance), selectedCurrency, exchangeRates));
  }, [currentBalance, selectedCurrency, exchangeRates]);

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

  // If user provided a currentBalance in UI, treat it as the value for the first month (January)
  const cumulativeNetWithBaseline = (() => {
    try {
      const base = Number(currentBalance || 0);
      const cum = Array.isArray(rowsNetSeries.cumulative) ? rowsNetSeries.cumulative.slice() : [];
      const labels = Array.isArray(rowsNetSeries.labels) ? rowsNetSeries.labels : [];
      if (labels.length === 0) return [];
      // Build series where index 0 = base (January), index i>0 = base + cumulative[i-1]
      return labels.map((_, i) => (i === 0 ? base : base + (cum[i - 1] || 0)));
    } catch (e) {
      return Array.isArray(rowsNetSeries.cumulative) ? rowsNetSeries.cumulative : [];
    }
  })();

  function saveCurrentBalance() {
    try {
      const key = `analysis:currentBalance`;
      localStorage.setItem(key, String(currentBalance || ""));
    } catch (e) {
      logError('StatisticsSummaryPage.saveCurrentBalance', e);
    }
  }

  try {
    return (
    /* Renders the annual summary page, including a header with the year selector, total balance, and a button to toggle the savings simulation panel. Also displays a list of monthly summaries with income, fee, balance, and difference from the previous month. */
    <section className="chart-dashboard-page">

      {/* Statistics summary when simulation is not shown */}
      {!showSimulation && (
        <section className="chart-dashboard-page">

          {/* Statistics summary when simulation is not shown */}
            <h3>{t.monthlySummaryGraphTitle || "Summary"}</h3>

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

            {/* Net-only chart (balance) */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
                <label style={{ color: '#9fb0d0', fontSize: '0.95rem', fontWeight: 500 }}>
                  Opening balance — January {year}
                </label>
                
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ color: '#9fb0d0', minWidth: '80px' }}>Amount:</label>
                  <input
                    type="number"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(e.target.value)}
                    placeholder="0"
                    style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc' }}
                  />
                </div>

                <button type="button" className="secondary-button" onClick={saveCurrentBalance} style={{ alignSelf: 'flex-start' }}>
                  {t.saveLabel || 'Save balance'}
                </button>

                {currentBalanceRaw && (
                <div style={{ color: '#9fb0d0', fontSize: '0.9rem' }}>
                  Saved value: {currentBalanceRaw}
                </div>
                )}
              </div>

              <br />
            </div>

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
