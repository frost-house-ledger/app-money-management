import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import { formatCurrency } from "../../lib/currency.js";
import SavingsSimulationPanel from "./SavingsSimulationPanel.jsx";
import { logError } from "../../lib/logger.js";

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

  try {
    return (
    /* Renders the annual summary page, including a header with the year selector, total balance, and a button to toggle the savings simulation panel. Also displays a list of monthly summaries with income, fee, balance, and difference from the previous month. */
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

        {/* Simulation button */}
        <button
          type="button"
          className={`secondary-button savings-sim-toggle ${showSimulation ? "active" : ""}`}
          onClick={() => setShowSimulation((v) => !v)}
        >
          {t.savingsSimButtonLabel}
        </button>
      </section>

      {/* Simulation panel */}
      {showSimulation && (
        <SavingsSimulationPanel
          annualRows={rows}
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
          t={t}
        />
      )}

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
