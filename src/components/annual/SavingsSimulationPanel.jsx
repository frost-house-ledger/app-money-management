import React, { useMemo, useState } from "react";
import { formatCurrency, formatNumericInput, sanitizeNumericInput } from "../../lib/currency.js";

let nextIncomePhaseId = 1;

function addSimMonth(yyyymm, offset) {
  const [y, m] = yyyymm.split("-").map(Number);
  const date = new Date(y, m - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// create a new income phase in the simulation with default values and a unique ID
function createIncomePhase() {
  return {
    id: nextIncomePhaseId++,
    afterMonths: "",
    income: ""
  };
}

export default function SavingsSimulationPanel({ annualRows, selectedCurrency, exchangeRates, t }) {
  const [currentSavings, setCurrentSavings] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [incomePhases, setIncomePhases] = useState([]);
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

  // Handlers for managing income phases: adding a new phase, updating an existing phase, and removing a phase.
  function handleAddIncomePhase() {
    setIncomePhases((current) => [...current, createIncomePhase()]);
  }

  function handleIncomePhaseChange(phaseId, key, value) {
    setIncomePhases((current) =>
      current.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              [key]: key === "income" ? sanitizeNumericInput(value) : value
            }
          : phase
      )
    );
  }

  function handleRemoveIncomePhase(phaseId) {
    setIncomePhases((current) => current.filter((phase) => phase.id !== phaseId));
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

    // Normalize income phases: filter out invalid entries, convert to numbers, and sort by afterMonths.
    const normalizedPhases = Array.from(
      incomePhases.reduce((phaseMap, phase) => {
        if (phase.afterMonths === "" || phase.income === "") {
          return phaseMap;
        }

        const afterMonths = Math.min(Math.max(0, Number(phase.afterMonths) || 0), months);
        const phaseIncome = Number(phase.income);

        if (!Number.isFinite(phaseIncome)) {
          return phaseMap;
        }

        phaseMap.set(afterMonths, phaseIncome);
        return phaseMap;
      }, new Map())
    )
      .map(([afterMonths, phaseIncome]) => ({ afterMonths, income: phaseIncome }))
      .sort((left, right) => left.afterMonths - right.afterMonths);
    const rows = [];

    // For each month, determine the applicable income based on the defined phases, calculate the monthly balance and cumulative savings.
    for (let i = 1; i <= months; i++) {
      const targetIncome = normalizedPhases.reduce(
        (currentIncome, phase) => (i > phase.afterMonths ? phase.income : currentIncome),
        income
      );
      const monthlyBalance = targetIncome - expense;
      const prevSavings = i === 1 ? initial : rows[i - 2].savings;
      rows.push({
        month: addSimMonth(startYYYYMM, i),
        monthlyBalance,
        savings: prevSavings + monthlyBalance
      });
    }
    return rows;
  }, [currentSavings, incomePhases, monthlyExpense, monthlyIncome, simMonths]);

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

      <div className="savings-sim-phase-list">
        <div className="savings-sim-phase-toolbar">
          <p className="savings-sim-phase-title">{t.savingsSimIncomeChangesLabel}</p>
          <button type="button" className="secondary-button savings-sim-phase-add" onClick={handleAddIncomePhase}>
            {t.savingsSimAddIncomeChange}
          </button>
        </div>

        <p className="subtext savings-sim-phase-help">{t.savingsSimIncomeChangesHelp}</p>
        
        {incomePhases.map((phase, index) => (
          <div key={phase.id} className="savings-sim-phase-row">
            <label>
              {t.savingsSimIncomeChangeAfterLabel.replace("{index}", String(index + 1))}
              <input
                type="number"
                min="0"
                max="120"
                value={phase.afterMonths}
                onChange={(e) => handleIncomePhaseChange(phase.id, "afterMonths", e.target.value)}
                placeholder="0"
              />
            </label>

            <label>
              {t.savingsSimIncomeChangeAmountLabel}
              <input
                type="text"
                inputMode="decimal"
                value={formatNumericInput(phase.income)}
                onChange={(e) => handleIncomePhaseChange(phase.id, "income", e.target.value)}
                placeholder="0"
              />
            </label>

            <button
              type="button"
              className="secondary-button savings-sim-phase-remove"
              onClick={() => handleRemoveIncomePhase(phase.id)}
            >
              {t.savingsSimRemoveIncomeChange}
            </button>
          </div>
        ))}
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
                className={simResult[simResult.length - 1].monthlyBalance >= 0 ? "positive-value" : "negative-value"}
              >
                {formatCurrency(simResult[0].monthlyBalance, selectedCurrency, exchangeRates)}
                {simResult[0].monthlyBalance !== simResult[simResult.length - 1].monthlyBalance && " -> "}
                {simResult[0].monthlyBalance !== simResult[simResult.length - 1].monthlyBalance &&
                  formatCurrency(simResult[simResult.length - 1].monthlyBalance, selectedCurrency, exchangeRates)}
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
