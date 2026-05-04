import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { formatCurrency } from "../../lib/currency.js";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const COLORS = ["#f97f69", "#2fbc9d", "#4f86c6", "#f4b942", "#b892ff", "#6bc1a7", "#f28c8c"];

export default function CategoryAnalysisPage({ selectedMonth, range, selectedCurrency, exchangeRates, locale, t }) {
  const [breakdownRows, setBreakdownRows] = useState([]);
  const [trendRows, setTrendRows] = useState([]);

  useEffect(() => {
    async function load() {
      const [breakdown, trend] = await Promise.all([
        window.ledgerApi.summary.categoryBreakdown({ month: selectedMonth, locale }),
        window.ledgerApi.summary.categoryTrend({
          fromMonth: range.fromMonth,
          toMonth: range.toMonth,
          locale
        })
      ]);
      setBreakdownRows(Array.isArray(breakdown) ? breakdown : []);
      setTrendRows(Array.isArray(trend) ? trend : []);
    }

    load();
  }, [selectedMonth, range.fromMonth, range.toMonth, locale]);

  const total = useMemo(() => breakdownRows.reduce((sum, row) => sum + Number(row.total || 0), 0), [breakdownRows]);

  const pieData = useMemo(() => {
    return breakdownRows.map((row) => ({
      name: `${row.categoryIcon} ${row.categoryDisplay}`,
      value: Number(row.total || 0)
    }));
  }, [breakdownRows]);

  const trendData = useMemo(() => {
    const byMonth = new Map();
    trendRows.forEach((row) => {
      const current = byMonth.get(row.month) || { month: row.month };
      current[row.categoryDisplay] = Number(row.total || 0);
      byMonth.set(row.month, current);
    });
    return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [trendRows]);

  const trendKeys = useMemo(() => {
    return Array.from(new Set(trendRows.map((row) => row.categoryDisplay)));
  }, [trendRows]);

  return (
    <section className="chart-dashboard-page">
      <section className="card">
        <h2>{t.categoryAnalysisTitle}</h2>
        <p className="subtext">{t.categoryAnalysisSubtext}</p>

        <ul className="list category-ratio-list">
          {breakdownRows.map((row) => {
            const ratio = total > 0 ? (Number(row.total || 0) / total) * 100 : 0;
            return (
              <li key={row.categoryId} className="daily-list-item">
                <strong>{row.categoryIcon} {row.categoryDisplay}</strong>
                <span>{ratio.toFixed(1)}%</span>
                <span>{formatCurrency(row.total, selectedCurrency, exchangeRates)}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card chart-card">
        <h2>{t.categoryRatioChartTitle}</h2>
        <div className="chart-wrap chart-wrap--pie">
          <Pie
            data={{
              labels: pieData.map((d) => d.name),
              datasets: [{
                data: pieData.map((d) => d.value),
                backgroundColor: pieData.map((_, i) => COLORS[i % COLORS.length]),
                borderWidth: 0,
              }],
            }}
            options={{
              responsive: false,
              plugins: {
                legend: { position: "right", labels: { color: "#8fa8c8", boxWidth: 14 } },
                tooltip: {
                  callbacks: {
                    label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed, selectedCurrency, exchangeRates)}`,
                  },
                },
              },
            }}
            width={320}
            height={260}
          />
        </div>
      </section>

      <section className="card chart-card">
        <h2>{t.categoryTrendChartTitle}</h2>
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
    </section>
  );
}
