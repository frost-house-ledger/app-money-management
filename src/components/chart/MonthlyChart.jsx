import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { formatCurrency } from "../../lib/currency.js";
import { logError } from "../../lib/logger.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, LineElement, LineController, PointElement, Tooltip, Legend, Filler);

export default function MonthlyChart({ rows, currencyCode = "JPY", exchangeRates = null, selectedDailyCategory = "all" }) {
  let labels = [];
  try {
    labels = rows.map((r) => r.month);
  } catch (err) {
    logError("MonthlyChart.labels", err);
    labels = [];
  }

  const showFee = true;

  const showIncome = selectedDailyCategory === "all";
  const showBalance = selectedDailyCategory === "all";

  let datasets = [];
  try {
    datasets = [
    showFee && {
      type: "bar",
      label: "fee",
      data: rows.map((r) => Math.round(r.fee)),
      backgroundColor: "#f97f69",
      borderRadius: 8,
      order: 2,
    },

    // Show income bars only when all categories are selected, because income becomes meaningless when filtered by category. For example, if you filter by a category that only has expenses, showing the income bar (which would be zero) would be confusing.
    showIncome && {
      type: "bar",
      label: "income",
      data: rows.map((r) => Math.round(Number(r.income) || 0)),
      backgroundColor: "#2fbc9d",
      borderRadius: 8,
      order: 2,
    },
    
    // Show balance as a line chart on top of the bars, but only when all categories are selected. This is because the balance number becomes meaningless when filtered by category.
    showBalance && {
      type: "line",
      label: "balance",
      data: rows.map((r) => Math.round(r.balance)),
      borderColor: "#174f83",
      borderWidth: 3,
      pointRadius: 0,
      tension: 0.3,
      order: 1,
    },
    ].filter(Boolean);
  } catch (err) {
    logError("MonthlyChart.datasets", err);
    datasets = [];
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
        // expose selectedDailyCategory to the plugin via options so plugin reads latest value
        dataLabelPluginOptions: { selectedDailyCategory },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, currencyCode, exchangeRates)}`,
        },
      },
    },
    scales: {
      x: { grid: { color: "rgba(255,255,255,0.07)" }, ticks: { color: "#8fa8c8" } },
      y: { grid: { color: "rgba(255,255,255,0.07)" }, ticks: { color: "#8fa8c8" } },
    },
    layout: { padding: { right: 8 } },
  };

  // Plugin to draw values on top of bar elements
  const dataLabelPlugin = {
    id: "dataLabelPlugin",
    afterDatasetsDraw: (chart) => {
      try {
        const { ctx } = chart;
        // read current selectedDailyCategory from chart options to avoid stale closure
        const currentCategory = chart.options?.plugins?.dataLabelPluginOptions?.selectedDailyCategory || "all";
        // eslint-disable-next-line no-console
        console.debug("dataLabelPlugin: run", { currentCategory });
        chart.data.datasets.forEach((dataset, datasetIndex) => {

            // Only draw for bar datasets
            if (dataset.type === "bar") {
              const meta = chart.getDatasetMeta(datasetIndex);
              
              // compute total for this dataset to show percentage
              const total = (Array.isArray(dataset.data) ? dataset.data : []).reduce((s, v) => s + (Number(v) || 0), 0);
              meta.data.forEach((bar, index) => {
                const value = dataset.data[index];
                if (value == null) return;
                const formatted = formatCurrency(value, currencyCode, exchangeRates);
                const percent = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0.0";

                // if not all categories, show values with number and percent
                if (currentCategory !== "all") {
                  // Only draw for fee dataset to avoid duplicate labels
                  if (dataset.label !== "fee") return;
                  // debug per-bar
                  // eslint-disable-next-line no-console
                  console.debug("dataLabelPlugin: drawing label", { datasetLabel: dataset.label, index, value });
                  ctx.save();
                  // choose label color based on app theme variable --ink (fallback to white)
                  let labelColor = "#ffffff";
                  try {
                    const cs = getComputedStyle(document.documentElement).getPropertyValue("--ink");
                    if (cs && cs.trim()) labelColor = cs.trim();
                  } catch (e) {
                    // ignore (server-side render or unavailable)
                  }
                  // simple luminance check to pick a contrasting stroke color
                  function hexToLuminance(hex) {
                    try {
                      const h = hex.replace("#", "");
                      const r = parseInt(h.substring(0, 2), 16) / 255;
                      const g = parseInt(h.substring(2, 4), 16) / 255;
                      const b = parseInt(h.substring(4, 6), 16) / 255;
                      // relative luminance
                      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
                    } catch (e) {
                      return 1; // assume light
                    }
                  }
                  const lum = hexToLuminance(labelColor);
                  const strokeColor = lum > 0.6 ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)";
                  ctx.fillStyle = labelColor;
                  ctx.strokeStyle = strokeColor;
                  ctx.lineWidth = 3;
                  ctx.font = "12px sans-serif";
                  ctx.textAlign = "center";

                  // prefer above the bar; if too close to top, place below
                  const x = bar.x;
                  let y = bar.y - 6;
                  const topPadding = 8;
                  if (y < topPadding) y = bar.y + 14;
                  const text = `${formatted} (${percent}%)`;
                  ctx.strokeText(text, x, y);
                  ctx.fillText(text, x, y);
                  ctx.restore();
                }
              });
            }
        });
      } catch (err) {
        logError("MonthlyChart.dataLabelPlugin", err);
      }
    },
  };

  return (
    <div className="chart-wrap">
      <Chart type="bar" data={{ labels, datasets }} options={options} plugins={[dataLabelPlugin]} />
    </div>
  );
}
