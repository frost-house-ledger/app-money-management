import React, { useMemo, useState } from "react";
import { formatCurrency, formatNumericInput, sanitizeNumericInput } from "../../lib/currency.js";

function addSimMonth(yyyymm, offset) {
  const [y, m] = yyyymm.split("-").map(Number);
  const date = new Date(y, m - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function SavingsSimulationPanel({ annualRows, selectedCurrency, exchangeRates, t }) {
  const [currentSavings, setCurrentSavings] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [simMonths, setSimMonths] = useState("24");

  const avgIncome = useMemo(() => {
    if (!annualRows.length) return 0;
    const total = annualRows.reduce((sum, r) => sum + Number(r.income || 0), 0);
    return Math.round(total / annualRows.length);
  }, [annualRows]);

  const avgExpense = useMemo(() => {
    if (!annualRows.length) return 0;
    const total = annualRows.reduce((sum, r) => sum + Number(r.fee || 0), 0);
    return Math.round(total / annualRows.length);
  }, [annualRows]);

  function handleAutoFill() {
    setMonthlyIncome(String(avgIncome));
    setMonthlyExpense(String(avgExpense));
  }

  const simResult = useMemo(() => {
    const income = Number(monthlyIncome);
    const expense = Number(monthlyExpense);
    const months = Math.min(Math.max(1, Number(simMonths) || 0), 120);
    const initial = Number(currentSavings);

    if (!Number.isFinite(income) || !Number.isFinite(expense) || !Number.isFinite(initial) || months <= 0) {
      return [];
    }
    if (monthlyIncome === "" || monthlyExpense === "" || currentSavings === "") {
      return [];
    }

    const today = new Date();
    const startYYYYMM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const monthlyBalance = income - expense;
    const rows = [];
    for (let i = 1; i <= months; i++) {
      rows.push({
        month: addSimMonth(startYYYYMM, i),
        monthlyBalance,
        savings: initial + monthlyBalance * i
      });
    }
    return rows;
  }, [currentSavings, monthlyIncome, monthlyExpense, simMonths]);

  const reachesGoal = simResult.length > 0;

  return (
    <section className="card savings-sim-panel">
      <h2>{t.savingsSimTitle}</h2>
      <p className="subtext">{t.savingsSimSubtext}</p>

      <div className="savings-sim-inputs">
        <label>
          {t.savingsSimCurrentLabel}
          <input
            type="text"
            inputMode="decimal"
            value={formatNumericInput(currentSavings)}
            onChange={(e) => setCurrentSavings(sanitizeNumericInput(e.target.value))}
            placeholder="0"
          />
        </label>

        <label>
          {t.savingsSimIncomeLabel}
          <input
            type="text"
            inputMode="decimal"
            value={formatNumericInput(monthlyIncome)}
            onChange={(e) => setMonthlyIncome(sanitizeNumericInput(e.target.value))}
            placeholder="0"
          />
        </label>

        <label>
          {t.savingsSimExpenseLabel}
          <input
            type="text"
            inputMode="decimal"
            value={formatNumericInput(monthlyExpense)}
            onChange={(e) => setMonthlyExpense(sanitizeNumericInput(e.target.value))}
            placeholder="0"
          />
        </label>

        <label>
          {t.savingsSimMonthsLabel}
          <input
            type="number"
            min="1"
            max="120"
            value={simMonths}
            onChange={(e) => setSimMonths(e.target.value)}
          />
        </label>
      </div>

      {annualRows.length > 0 && (
        <button type="button" className="secondary-button savings-sim-autofill" onClick={handleAutoFill}>
          {t.savingsSimAutoFill}
        </button>
      )}

      {simResult.length === 0 ? (
        <p className="subtext savings-sim-empty">{t.savingsSimNoData}</p>
      ) : (
        <>
          <div className="savings-sim-summary">
            <span>
              {t.savingsSimColMonthly}:{" "}
              <strong
                className={Number(monthlyIncome) - Number(monthlyExpense) >= 0 ? "positive-value" : "negative-value"}
              >
                {formatCurrency(Number(monthlyIncome) - Number(monthlyExpense), selectedCurrency, exchangeRates)}
              </strong>
            </span>
            <span>
              {simResult[simResult.length - 1].month} :{" "}
              <strong>{formatCurrency(simResult[simResult.length - 1].savings, selectedCurrency, exchangeRates)}</strong>
            </span>
          </div>

          <div className="annual-list-head savings-sim-head">
            <span>{t.savingsSimColMonth}</span>
            <span>{t.savingsSimColMonthly}</span>
            <span>{t.savingsSimColSavings}</span>
          </div>
          <ul className="list savings-sim-list">
            {simResult.map((row) => (
              <li key={row.month} className="savings-sim-row">
                <strong>{row.month}</strong>
                <span
                  className={row.monthlyBalance >= 0 ? "positive-value" : "negative-value"}
                >
                  {formatCurrency(row.monthlyBalance, selectedCurrency, exchangeRates)}
                </span>
                <span className={row.savings >= 0 ? "" : "negative-value"}>
                  {formatCurrency(row.savings, selectedCurrency, exchangeRates)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
