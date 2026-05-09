import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import { formatCurrency } from "../../lib/currency.js";
import SavingsSimulationPanel from "./SavingsSimulationPanel.jsx";

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

  useEffect(() => {
    async function load() {
      const fromMonth = `${year}-01`;
      const toMonth = `${year}-12`;
      const result = await api.summary.range({ fromMonth, toMonth });
      setRows(Array.isArray(result) ? result : []);
    }
    load();
  }, [year]);

  const totalBalance = useMemo(() => rows.reduce((sum, row) => sum + Number(row.balance || 0), 0), [rows]);

  const rowsWithDiff = useMemo(() => {
    return rows.map((row, index) => {
      if (index === 0) {
        return { ...row, diffFromPrevious: null };
      }
      const prev = rows[index - 1];
      return {
        ...row,
        diffFromPrevious: Number(row.balance || 0) - Number(prev.balance || 0)
      };
    });
  }, [rows]);

  return (
    <section className="chart-dashboard-page">
      <section className="card annual-header-card">
        <h2>{t.annualSummaryTitle}</h2>
        <p className="subtext">{t.annualSummarySubtext}</p>
        <label>
          {t.yearLabel}
          <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} />
        </label>
        <p>
          {t.annualTotalBalanceLabel}: <strong>{formatCurrency(totalBalance, selectedCurrency, exchangeRates)}</strong>
        </p>
        <button
          type="button"
          className={`secondary-button savings-sim-toggle ${showSimulation ? "active" : ""}`}
          onClick={() => setShowSimulation((v) => !v)}
        >
          {t.savingsSimButtonLabel}
        </button>
      </section>

      {showSimulation && (
        <SavingsSimulationPanel
          annualRows={rows}
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
          t={t}
        />
      )}

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
    </section>
  );
}
