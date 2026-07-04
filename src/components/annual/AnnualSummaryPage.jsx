import React, { useEffect, useMemo, useState } from "react";
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
    } catch (e) {
      logError("AnnualSummaryPage.loadCurrentBalance", e);
    }
  }, []);

  useEffect(() => {
    async function loadEntriesAndComputeSeries() {
      try {
        // fetch all entries and compute cumulative balance by date up to today
        const all = await api.entry.list({});
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
      setMonthlyBalances(Array.isArray(parsed) ? parsed : []);
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
      localStorage.setItem(key, JSON.stringify(next));
      setMonthlyBalances(next);
      if (baselineKey === month) setBaselineKey("current");
    } catch (e) {
      logError("AnnualSummaryPage.deleteMonthlyBalance", e);
    }
  }

  try {
    return (
    /* Renders the annual summary page, including a header with the year selector, total balance, and a button to toggle the savings simulation panel. Also displays a list of monthly summaries with income, fee, balance, and difference from the previous month. */
    <section className="chart-dashboard-page">

      {/* Actual balance input and balance timeline */}
      <section className="card chart-card">
        <h2>実際の残高</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <input
            type="number"
            placeholder="現在の残高を入力"
            value={currentBalance}
            onChange={(e) => setCurrentBalance(e.target.value)}
            style={{ padding: 8 }}
          />

          <label style={{ display: "flex", flexDirection: "column" }}>
            保存先の月
            <input type="month" value={saveMonth} onChange={(e) => setSaveMonth(e.target.value)} />
          </label>
          <button type="button" className="secondary-button" onClick={saveMonthlyBalance}>月次残高として保存</button>
        </div>

        <div style={{ marginTop: 8 }}>
          <strong>保存した月次残高</strong>
          {monthlyBalances.length === 0 && <div className="subtext">保存されたデータはありません。</div>}
          <ul className="list small-list">
            {monthlyBalances.map((m) => (
              <li key={m.month} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{m.month} — {formatCurrency(Number(m.balance || 0), selectedCurrency, exchangeRates)}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="secondary-button" onClick={() => setBaselineKey(m.month)}>基準にする</button>
                  <button type="button" className="secondary-button" onClick={() => deleteMonthlyBalance(m.month)}>削除</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card annual-header-card">
        <h2>{t.balanceTrendTitle}</h2>
        <p className="subtext">{t.balanceTrendSubtext}</p>
      
        {/* Current balance display + month-range controls + monthly chart (above simulation button) */}
        <div style={{ marginTop: 12, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <div>
              <strong>現在の残高:</strong> {formatCurrency(Number(currentBalance || 0), selectedCurrency, exchangeRates)}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ display: "flex", flexDirection: "column" }}>
                開始月
                <input type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column" }}>
                終了月
                <input
                  type="month"
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value > todayMonth ? todayMonth : e.target.value)}
                />
              </label>
            </div>
          </div>

          <div style={{ height: 220 }}>
            {monthlySeries.labels && monthlySeries.labels.length > 0 ? (
              <Bar
                data={{
                  labels: monthlySeries.labels,
                  datasets: [
                    {
                      type: "bar",
                      label: "月次増減",
                      data: monthlySeries.netData,
                      backgroundColor: barColors,
                      yAxisID: "y",
                    },
                    {
                      type: "line",
                      label: baselineKey === "current" ? "残高(現在基準)" : `残高(基準: ${baselineKey})`,
                      data: displayCumulative,
                      borderColor: "rgb(37,99,235)",
                      backgroundColor: "transparent",
                      yAxisID: "y",
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false },
                  scales: {
                    y: { beginAtZero: false },
                  },
                }}
              />
            ) : (
              <div className="subtext">指定した範囲に表示できるデータがありません。</div>
            )}
          </div>
        </div>

      </section>
        {/* Annual summary when simulation is not shown */}
        {!showSimulation && (
          <section className="card">
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

        {/* Simulation button */}
        <button
          type="button"
          className={`secondary-button savings-sim-toggle ${showSimulation ? "active" : ""}`}
          onClick={() => setShowSimulation((v) => !v)}
        >
          {t.savingsSimButtonLabel}
        </button>

        {/* Simulation panel */}
        {showSimulation && (
          <SavingsSimulationPanel
            annualRows={rows}
            selectedCurrency={selectedCurrency}
            exchangeRates={exchangeRates}
            t={t}
          />
        )}
    </section>
    );
  } catch (err) {
    logError("AnnualSummaryPage.render", err);
    return (
      <section className="chart-dashboard-page">
        <p className="error">{t?.errorUnexpectedMessage || "表示中にエラーが発生しました"}</p>
      </section>
    );
  }
}
