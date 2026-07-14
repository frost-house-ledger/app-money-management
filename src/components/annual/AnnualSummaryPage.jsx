import React, { useEffect, useMemo, useState, useRef } from "react";
import { api } from "../../lib/api.js";
import { formatCurrency } from "../../lib/currency.js";
import SavingsSimulationPanel from "./SavingsSimulationPanel.jsx";
import { logError } from "../../lib/logger.js";

import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Pie, Bar, Line } from "react-chartjs-2";
import { buildEntryListPayload } from "../../lib/chartFilterPayloads.js";
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);


function formatDelta(value, currency, rates) {
  const amount = Number(value || 0);
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(amount), currency, rates)}`;
}

export default function AnnualSummaryPage({ selectedCurrency, exchangeRates, t }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const [rows, setRows] = useState([]);
  const [showSimulation, setShowSimulation] = useState(false);

  const [currentBalance, setCurrentBalance] = useState("");
  const [currentBalanceRaw, setCurrentBalanceRaw] = useState("");
  const [balanceSeries, setBalanceSeries] = useState({ labels: [], data: [] });
  const [simulateMonths, setSimulateMonths] = useState(3);
  const [simulationSeries, setSimulationSeries] = useState({ labels: [], data: [] });
  
  const [fromMonth, setFromMonth] = useState(`${thisYear}-01`);
  const todayMonth = new Date().toISOString().slice(0, 7);
  const [toMonth, setToMonth] = useState(todayMonth);
  const [monthlySeries, setMonthlySeries] = useState({ labels: [], netData: [], cumulativeData: [] });
  const [monthlyBalances, setMonthlyBalances] = useState([]);
  const [saveMonth, setSaveMonth] = useState(todayMonth);
  const [baselineKey, setBaselineKey] = useState("current");
  const [showGridlines, setShowGridlines] = useState(true);
  const [saving, setSaving] = useState(false);
  const [futureMonthWarning, setFutureMonthWarning] = useState(false);
  const futureWarningTimerRef = useRef(null);

  // Ensure toMonth is never set beyond today's month — auto-correct if user picks a future month
  useEffect(() => {
    try {
      if (toMonth > todayMonth) {
        setToMonth(todayMonth);
      }
    } catch (e) {
      /* no-op */
    }
  }, [toMonth, todayMonth]);

  useEffect(() => {
    return () => {
      if (futureWarningTimerRef.current) {
        clearTimeout(futureWarningTimerRef.current);
        futureWarningTimerRef.current = null;
      }
    };
  }, []);

  function handleToMonthChange(e) {
    try {
      const v = e.target.value;
      if (v > todayMonth) {
        // keep existing auto-correct behaviour but show a short warning to the user
        setToMonth(todayMonth);
        setFutureMonthWarning(true);
        if (futureWarningTimerRef.current) clearTimeout(futureWarningTimerRef.current);
        futureWarningTimerRef.current = setTimeout(() => {
          setFutureMonthWarning(false);
          futureWarningTimerRef.current = null;
        }, 3000);
      } else {
        setToMonth(v);
      }
    } catch (err) {
      // fallback: apply value
      setToMonth(e.target.value);
    }
  }

  useEffect(() => {
    async function load() {
      const fromMonth = `${year}-01`;
      const toMonth = `${year}-12`;
      try {
        const result = await api.summary.range({ fromMonth, toMonth });
        setRows(Array.isArray(result) ? result : []);
      } catch (err) {
        logError("AnnualSummaryPage.load", err);
        setRows([]);
      }
    }
    load();
  }, [year]);
  const safeRows = Array.isArray(rows) ? rows : [];

  const totalBalance = useMemo(() => safeRows.reduce((sum, row) => sum + Number(row.balance || 0), 0), [safeRows]);

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
      logError("AnnualSummaryPage.rowsWithDiff", err);
      return [];
    }
  }, [safeRows]);

  // Load saved current actual balance for analysis and compute balance series
  useEffect(() => {
    try {
      const key = `analysis:currentBalance`;
      const saved = localStorage.getItem(key);
      if (saved !== null) setCurrentBalance(saved);
      if (saved !== null) setCurrentBalanceRaw(formatCurrency(Number(saved), selectedCurrency, exchangeRates));
    } catch (e) {
      logError("AnnualSummaryPage.loadCurrentBalance", e);
    }
  }, []);

  useEffect(() => {
    async function loadEntriesAndComputeSeries() {
      try {
        // fetch all entries and compute cumulative balance by date up to today
        // request entries for the current month to satisfy backend validation
        const payload = buildEntryListPayload({ month: todayMonth, selectedDailyCategory: 'all', dateRange: {} });
        const all = await api.entry.list(payload);
        const today = new Date().toISOString().slice(0, 10);
        const filtered = Array.isArray(all) ? all.filter((r) => (r.entryDate || "") <= today) : [];
        // aggregate by date
        const byDate = new Map();
        filtered.forEach((r) => {
          const d = String(r.entryDate || "");
          const signed = r.type === "income" ? Number(r.amount || 0) : -Number(r.amount || 0);
          byDate.set(d, (byDate.get(d) || 0) + signed);
        });
        const dates = Array.from(byDate.keys()).sort();
        const startBalance = Number(currentBalance === "" ? 0 : Number(currentBalance || 0));
        const labels = [];
        const data = [];
        let running = startBalance;
        for (const d of dates) {
          running = running + (byDate.get(d) || 0);
          labels.push(d);
          data.push(running);
        }
        setBalanceSeries({ labels, data });
      } catch (e) {
        logError("AnnualSummaryPage.balanceSeries", e);
        setBalanceSeries({ labels: [], data: [] });
      }
    }
    loadEntriesAndComputeSeries();
  }, [currentBalance]);

  // Load monthly aggregated data and compute monthly net + cumulative series
  useEffect(() => {
    async function loadMonthlySeries() {
      try {
        // Ensure toMonth is not in the future
        const cappedTo = toMonth > todayMonth ? todayMonth : toMonth;
        const result = await api.summary.range({ fromMonth: fromMonth, toMonth: cappedTo });
        const rows = Array.isArray(result) ? result.slice() : [];
        rows.sort((a, b) => String(a.month || "").localeCompare(String(b.month || "")));

        const labels = rows.map((r) => r.month || "");
        const netData = rows.map((r) => Number(r.income || 0) - Number(r.fee || 0));
        // compute cumulative sums starting from zero (so we can align to any baseline)
        const cumulative = [];
        let running = 0;
        for (const n of netData) {
          running = running + n;
          cumulative.push(running);
        }
        setMonthlySeries({ labels, netData, cumulativeData: cumulative });
      } catch (e) {
        logError("AnnualSummaryPage.monthlySeries", e);
        setMonthlySeries({ labels: [], netData: [], cumulativeData: [] });
      }
    }
    loadMonthlySeries();
  }, [fromMonth, toMonth, currentBalance]);

  // Derived chart data: baseline alignment and bar colors
  const baselineValue = (() => {
    if (baselineKey === "current") return Number(currentBalance || 0);
    const it = monthlyBalances.find((m) => m.month === baselineKey);
    return it ? Number(it.balance || 0) : Number(currentBalance || 0);
  })();

  const cumulativeFromZero = Array.isArray(monthlySeries.cumulativeData) ? monthlySeries.cumulativeData : [];
  const displayCumulative = cumulativeFromZero.map((v, i) => {
    if (baselineKey === "current") {
      return Number(currentBalance || 0) + v;
    }
    const idx = (monthlySeries.labels || []).indexOf(baselineKey);
    if (idx >= 0) {
      const offset = baselineValue - (cumulativeFromZero[idx] || 0);
      return v + offset;
    }
    return baselineValue + v;
  });

  const barColors = (monthlySeries.netData || []).map((n) => (n >= 0 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)"));

  // Load saved monthly balances from localStorage
  useEffect(() => {

    try {
      const key = `analysis:monthlyBalances`;
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(parsed) ? parsed.slice() : [];
      arr.sort((a, b) => String(a.month || "").localeCompare(String(b.month || "")));
      setMonthlyBalances(arr);

    } catch (e) {
      logError("AnnualSummaryPage.loadMonthlyBalances", e);
      setMonthlyBalances([]);
    }
  }, []);

  function saveMonthlyBalance() {
    try {
      const key = `analysis:monthlyBalances`;
      const month = saveMonth || todayMonth;
      const bal = Number(currentBalance || 0);
      const next = monthlyBalances.filter((m) => m.month !== month).concat({ month, balance: bal });
      next.sort((a, b) => String(a.month || "").localeCompare(String(b.month || "")));
      localStorage.setItem(key, JSON.stringify(next));
      setMonthlyBalances(next);
    } catch (e) {
      logError("AnnualSummaryPage.saveMonthlyBalance", e);
    }
  }

  function deleteMonthlyBalance(month) {
    try {
      const key = `analysis:monthlyBalances`;
      const next = monthlyBalances.filter((m) => m.month !== month);
      next.sort((a, b) => String(a.month || "").localeCompare(String(b.month || "")));
      localStorage.setItem(key, JSON.stringify(next));
      setMonthlyBalances(next);
      if (baselineKey === month) setBaselineKey("current");
    } catch (e) {
      logError("AnnualSummaryPage.deleteMonthlyBalance", e);
    }
  }

  function confirmDeleteMonthlyBalance(month) {
    try {
      const ok = window.confirm(`${month} の保存済み残高を削除しますか？`);
      if (!ok) return;
      deleteMonthlyBalance(month);
    } catch (e) {
      logError('AnnualSummaryPage.confirmDeleteMonthlyBalance', e);
    }
  }

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
      logError('AnnualSummaryPage.rowsNetSeries', e);
      return { labels: [], net: [], cumulative: [] };
    }
  }, [rowsWithDiff]);

  const cumulativeNetDisplay = Array.isArray(rowsNetSeries.cumulative) ? rowsNetSeries.cumulative : [];

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
      setCurrentBalanceRaw(formatCurrency(Number(currentBalance || 0), selectedCurrency, exchangeRates));
    } catch (e) {
      logError('AnnualSummaryPage.saveCurrentBalance', e);
    }
  }

  try {
    return (
    /* Renders the annual summary page, including a header with the year selector, total balance, and a button to toggle the savings simulation panel. Also displays a list of monthly summaries with income, fee, balance, and difference from the previous month. */
    <section className="chart-dashboard-page">

      {/* Annual summary when simulation is not shown */}
      {!showSimulation && (
        <section className="chart-dashboard-page">

          {/* Annual summary when simulation is not shown */}
            <h3>{t.monthlySummaryTitle || "月次サマリ"}</h3>

            <div style={{ height: 220, marginTop: 12 }}>
              {rowsWithDiff && rowsWithDiff.length > 0 ? (
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
                      x: { grid: { color: showGridlines ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0)' }, ticks: { color: '#9fb0d0' } },
                      y: { grid: { color: showGridlines ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0)' }, ticks: { color: '#9fb0d0' } },
                    },
                  }}
                />
              ) : (
                <div className="subtext">No data available to display.</div>
              )}
            </div>

            <br />

            {/* Net-only chart (収支) */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <label style={{ color: '#9fb0d0' }}>{t.currentBalanceLabel || `${year}年1月の残高`}</label>
                <input
                  type="number"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  placeholder="0"
                  style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc' }}
                />
                <button type="button" className="secondary-button" onClick={saveCurrentBalance}>
                  {t.saveLabel || '保存'}
                </button>
                <div style={{ color: '#9fb0d0', marginLeft: 'auto' }}>
                  {currentBalanceRaw}
                </div>
              </div>
              <div style={{ height: 140 }}>
              {rowsNetSeries.labels && rowsNetSeries.labels.length > 0 ? (
                <Bar
                  data={{
                    labels: rowsNetSeries.labels,
                    datasets: [
                      {
                        type: 'bar',
                        label: t.balanceOverlayLabel || "残高(JPY)",
                        data: cumulativeNetWithBaseline,
                        backgroundColor: (cumulativeNetWithBaseline || []).map((n) => (n >= 0 ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)')),
                        yAxisID: 'y',
                        order: 2,
                      },
                      {
                        type: 'line',
                        label: t.netLabel || "収支",
                        data: cumulativeNetWithBaseline,
                        borderColor: "rgba(37,99,235,1)",
                        backgroundColor: "rgba(37,99,235,0.08)",
                        pointBackgroundColor: "rgba(37,99,235,1)",
                        pointBorderColor: "#fff",
                        tension: 0.2,
                        fill: true,
                        order: 1,
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
                      x: { grid: { color: showGridlines ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0)' }, ticks: { color: '#9fb0d0' } },
                      y: { grid: { color: showGridlines ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0)' }, ticks: { color: '#9fb0d0' } },
                    },
                  }}
                />
              ) : (
                <div className="subtext">No data available to display.</div>
              )}
            </div>
            </div>

            <br />

            <div className="annual-list-head">
              <span>{t.monthLabel}</span>
              <span>{t.summaryIncome}</span>
              <span>{t.summaryFee}</span>
              <span>{t.summaryBalance}</span>
              <span>{t.monthComparisonLabel}</span>
            </div>
            <ul className="list annual-list">
              {rowsWithDiff.map((row) => (
                <li key={row.month} className="daily-list-item">
                  <strong>{row.month}</strong>
                  <span>{formatCurrency(row.income, selectedCurrency, exchangeRates)}</span>
                  <span>{formatCurrency(row.fee, selectedCurrency, exchangeRates)}</span>
                  <span>{formatCurrency(row.balance, selectedCurrency, exchangeRates)}</span>
                  <span
                    className={
                      row.diffFromPrevious == null
                        ? "month-diff"
                        : row.diffFromPrevious >= 0
                          ? "month-diff positive"
                          : "month-diff negative"
                    }
                  >
                    {row.diffFromPrevious == null ? "-" : formatDelta(row.diffFromPrevious, selectedCurrency, exchangeRates)}
                  </span>
                </li>
              ))}
            </ul>
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
    logError("AnnualSummaryPage.render", err);
    return (
      <section className="chart-dashboard-page">
        <p className="error">{t?.errorUnexpectedMessage || "An unexpected error occurred while displaying the annual summary page."}</p>
      </section>
    );
  }
}
