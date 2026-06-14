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

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, LineElement, LineController, PointElement, Tooltip, Legend, Filler);

export default function MonthlyChart({ rows, currencyCode = "JPY", exchangeRates = null }) {
  const labels = rows.map((r) => r.month);
  const showFee = true;
  const showIncome = true;

  const datasets = [
    showFee && {
      type: "bar",
      label: "fee",
      data: rows.map((r) => Math.round(r.fee)),
      backgroundColor: "#f97f69",
      borderRadius: 8,
      order: 2,
    },
    showIncome && {
      type: "bar",
      label: "income",
      data: rows.map((r) => Math.round(Number(r.income) || 0)),
      backgroundColor: "#2fbc9d",
      borderRadius: 8,
      order: 2,
    },
    {
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

  const options = {
    responsive: false,
    plugins: {
      legend: { display: false },
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
  };

  return (
    <div className="chart-wrap">
      <Chart type="bar" data={{ labels, datasets }} options={options} width={680} height={300} />
    </div>
  );
}
