import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
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
import { Pie, Bar } from 'react-chartjs-2';

// register Chart.js components for react-chartjs-2
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);
import { formatCurrency } from "../../lib/currency.js";
import { logError } from "../../lib/logger.js";
import TargetAmountSetting from "./TargetAmountSetting.jsx";

const COLORS = ["#f97f69", "#2fbc9d", "#4f86c6", "#f4b942", "#b892ff", "#6bc1a7", "#f28c8c"];

export default function CategoryAnalysisPage({ selectedMonth, range, selectedCurrency, exchangeRates, locale, t }) {
  const [breakdownRows, setBreakdownRows] = useState([]);
  const [trendRows, setTrendRows] = useState([]);
  const [targets, setTargets] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [view, setView] = useState("main"); // 'main' or 'targetSetting'

  useEffect(() => {
    async function load() {
      try {
        const year = selectedMonth.slice(0, 4);
        const yearStartMonth = `${year}-01`;
        const yearEndMonth = `${year}-12`;
        const [breakdown, trend] = await Promise.all([
          api.summary.categoryBreakdown({ month: selectedMonth, locale }),
          api.summary.categoryTrend({
            fromMonth: yearStartMonth,
            toMonth: yearEndMonth,
            locale
          })
        ]);
        setBreakdownRows(Array.isArray(breakdown) ? breakdown : []);
        setTrendRows(Array.isArray(trend) ? trend : []);
      } catch (err) {
        logError("CategoryAnalysisPage.load", err);
        setBreakdownRows([]);
        setTrendRows([]);
      }
    }

    load();
  }, [selectedMonth, locale]
  );

  // Load saved monthly targets for the selected month from localStorage
  useEffect(() => {
    async function loadTargets() {
      // Prefer DB-stored targets when available
      try {
        const fromDb = await api.targets.get(selectedMonth);
        if (Array.isArray(fromDb) && fromDb.length > 0) {
          const map = Object.fromEntries(fromDb.map((r) => [r.categoryId, Number(r.amount || 0)]));
          setTargets(map);
          return;
        }
      } catch (e) {
        logError("CategoryAnalysisPage.loadTargets.db", e);
      }
      const key = `categoryTargets:${selectedMonth}`;
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "{}");
        setTargets(saved);
      } catch (e) {
        logError("CategoryAnalysisPage.loadTargets.localStorage", e);
        setTargets({});
      }
    }
    loadTargets();
  }, [selectedMonth]);

  function handleTargetChange(categoryKey, value) {
    const keyName = `categoryTargets:${selectedMonth}`;
    const num = value === "" ? "" : Number(value || 0);
    setTargets((prev) => {
      const next = { ...(prev || {}), [categoryKey]: num };
      try {
        localStorage.setItem(keyName, JSON.stringify(next));
      } catch (e) {
        logError("CategoryAnalysisPage.handleTargetChange.localStorage", e);
      }
      return next;
    });
  }

  async function handleSaveTargets() {
    setSaving(true);
    setSaveMessage("");
    try {
      await api.targets.save({ month: selectedMonth, targets });
      setSaveMessage("Saved");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch (err) {
      logError("CategoryAnalysisPage.handleSaveTargets", err);
      setSaveMessage(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }


  // summary: breakdownRows with categoryDisplay
  const safeBreakdownRows = Array.isArray(breakdownRows) ? breakdownRows : [];
  const safeTrendRows = Array.isArray(trendRows) ? trendRows : [];

  const mergedRows = useMemo(() => {
    try {
      // Merge rows by display name to avoid duplicate categoryDisplay entries
      const map = new Map();
      for (const row of safeBreakdownRows) {
        const display = String(row.categoryDisplay || "");
        if (map.has(display)) {
          const existing = map.get(display);
          existing.total = Number(existing.total || 0) + Number(row.total || 0);
          // prefer an explicit categoryId if we don't have one yet
          if (!existing.categoryId && row.categoryId) existing.categoryId = row.categoryId;
          if (!existing.categoryIcon && row.categoryIcon) existing.categoryIcon = row.categoryIcon;
        } else {
          map.set(display, { ...row, total: Number(row.total || 0), categoryId: row.categoryId });
        }
      }
      return Array.from(map.values());
    } catch (err) {
      logError("CategoryAnalysisPage.mergedRows", err);
      return [];
    }
  }, [safeBreakdownRows]);

  const total = useMemo(() => {
    try {
      return mergedRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    } catch (err) {
      logError("CategoryAnalysisPage.total", err);
      return 0;
    }
  }, [mergedRows]);

  const pieData = useMemo(() => {
    try {
      return mergedRows.map((row) => ({
        name: `${row.categoryIcon} ${row.categoryDisplay}`,
        value: Number(row.total || 0)
      }));
    } catch (err) {
      logError("CategoryAnalysisPage.pieData", err);
      return [];
    }
  }, [mergedRows]);

  const trendData = useMemo(() => {
    try {
      const year = selectedMonth.slice(0, 4);
      const byMonth = new Map();
      
      // Initialize all 12 months in YYYY-MM format
      for (let m = 1; m <= 12; m++) {
        const month = `${year}-${String(m).padStart(2, '0')}`;
        byMonth.set(month, { month });
      }
      
      // Fill in data from safeTrendRows
      safeTrendRows.forEach((row) => {
        const current = byMonth.get(row.month) || { month: row.month };
        current[row.categoryDisplay] = Number(row.total || 0);
        byMonth.set(row.month, current);
      });
      
      return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
    } catch (err) {
      logError("CategoryAnalysisPage.trendData", err);
      return [];
    }
  }, [safeTrendRows, selectedMonth]);

  const trendKeys = useMemo(() => {
    try {
      return Array.from(new Set(safeTrendRows.map((row) => row.categoryDisplay)));
    } catch (err) {
      logError("CategoryAnalysisPage.trendKeys", err);
      return [];
    }
  }, [safeTrendRows]);

  const formatTrendRange = (selectedMonth) => {
    if (!selectedMonth || selectedMonth.length < 6) return "";
    const year = selectedMonth.slice(0, 4);
    const startMonth = `${year}01`;
    const endMonth = `${year}12`;
    return `${startMonth}-${endMonth}`;
  };

  return (
    <section className="chart-dashboard-page">
      {/* When clicking the target amount setting button */}

      {/* Target Amount Setting Modal */}
      {view === "targetSetting" ? (
        <TargetAmountSetting
          mergedRows={mergedRows}
          targets={targets}
          handleTargetChange={handleTargetChange}
          handleSaveTargets={handleSaveTargets}
          saving={saving}
          saveMessage={saveMessage}
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
          formatCurrency={formatCurrency}
          onBack={() => setView("main")}
        />
      ) : (
        <>
          <section className="card">
        <h2>{t.categoryAnalysisTitle}({selectedMonth})</h2>
        <p className="subtext">{t.categoryAnalysisSubtext}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Top: Category table */}
          <div>
            <div style={{ marginBottom: 12, fontSize: "0.875rem", color: "#8fa8c8" }}>
              ※目標額を超過した項目は赤文字で表示されます。
            </div>
            <table className="app-table" style={{ tableLayout: "fixed", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", width: "140px"}}>{t.categoryLabel}</th>
                  <th style={{ textAlign: "left", width: "140px"}}>{t.amountLabel}</th>
                  <th style={{ textAlign: "left", width: "140px"}}>{t.percentageLabel}</th>
                </tr>
              </thead>

              <tbody>
                {mergedRows.map((row) => {
                  const key = row.categoryId || row.categoryDisplay;

                  const targetVal = targets[key] === "" || targets[key] === undefined ? null : Number(targets[key]);
                  const amountVal = Number(row.total || 0);
                  const exceeded = targetVal !== null && !Number.isNaN(targetVal) && amountVal > targetVal;
                  const percentage = total > 0 ? ((amountVal / total) * 100).toFixed(1) : 0;

                  return (
                    <tr key={key} className="daily-list-item">
                      <td style={{ textAlign: "left", width: "140px" }}>
                        <strong>{row.categoryIcon} {row.categoryDisplay}</strong>
                      </td>

                      <td style={{ textAlign: "left", width: "140px"}} className={`amount ${exceeded ? "exceeded" : ""}`}>{formatCurrency(row.total, selectedCurrency, exchangeRates)}</td>
                      <td style={{ textAlign: "left", width: "140px"}}>{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <button className="secondary-button" type="button" onClick={() => setView("targetSetting")}>
                目標額を設定
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* category trend graph for each month */}
      <section className="card chart-card">
        <h2>{t.categoryTrendChartTitle}({formatTrendRange(selectedMonth)})</h2>
        <div className="chart-wrap">
          <Bar
            data={{
              labels: trendData.map((d) => d.month),
              datasets: trendKeys.map((key, idx) => ({
                label: key,
                data: trendData.map((d) => d[key] ?? 0),
                backgroundColor: COLORS[idx % COLORS.length],
                borderRadius: 4,
                stack: "category",
              })),
            }}
            options={{
              responsive: false,
              plugins: {
                legend: { labels: { color: "#8fa8c8", boxWidth: 14 } },
                tooltip: {
                  callbacks: {
                    label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, selectedCurrency, exchangeRates)}`,
                  },
                },
              },
              scales: {
                x: { stacked: true, grid: { color: "rgba(255,255,255,0.07)" }, ticks: { color: "#8fa8c8" } },
                y: { stacked: true, grid: { color: "rgba(255,255,255,0.07)" }, ticks: { color: "#8fa8c8" } },
              },
            }}
            width={680}
            height={300}
          />
        </div>
          </section>
        </>
      )}
    </section>
  
  );
}
