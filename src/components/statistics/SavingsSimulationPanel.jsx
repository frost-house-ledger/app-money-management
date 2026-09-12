import React, { useMemo, useState } from "react";
import { formatCurrency, formatNumericInput, sanitizeNumericInput } from "../../lib/currency.js";
import { logError } from "../../lib/logger.js";

let nextIncomePhaseId = 1;

function addSimMonth(yyyymm, offset) {
  const [y, m] = yyyymm.split("-").map(Number);
  const date = new Date(y, m - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthOffset(fromYYYYMM, toYYYYMM) {
  const [fromYear, fromMonth] = fromYYYYMM.split("-").map(Number);
  const [toYear, toMonth] = toYYYYMM.split("-").map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

// create a new income phase in the simulation with default values and a unique ID
function createIncomePhase() {
  return {
    id: nextIncomePhaseId++,
    month: "",
    income: "",
    expense: ""
  };
}

export default function SavingsSimulationPanel({ annualRows, selectedCurrency, exchangeRates, t }) {
  const safeAnnualRows = Array.isArray(annualRows) ? annualRows : [];
  const [currentSavings, setCurrentSavings] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [incomePhases, setIncomePhases] = useState([]);
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [simMonths, setSimMonths] = useState("24");

  const avgIncome = useMemo(() => {
    try {
      if (!safeAnnualRows.length) return 0;
      const total = safeAnnualRows.reduce((sum, r) => sum + Number(r.income || 0), 0);
      return Math.round(total / safeAnnualRows.length);
    } catch (err) {
      logError("SavingsSimulationPanel.avgIncome", err);
      return 0;
    }
  }, [safeAnnualRows]);

  const avgExpense = useMemo(() => {
    try {
      if (!safeAnnualRows.length) return 0;
      const total = safeAnnualRows.reduce((sum, r) => sum + Number(r.fee || 0), 0);
      return Math.round(total / safeAnnualRows.length);
    } catch (err) {
      logError("SavingsSimulationPanel.avgExpense", err);
      return 0;
    }
  }, [safeAnnualRows]);

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
              [key]: key === "income" || key === "expense" ? sanitizeNumericInput(value) : value
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

    try {
      if (!Number.isFinite(income) || !Number.isFinite(expense) || !Number.isFinite(initial) || months <= 0) {
        return [];
      }
      if (monthlyIncome === "" || monthlyExpense === "" || currentSavings === "") {
        return [];
      }

    const today = new Date();
    const startYYYYMM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    // Normalize changes and sort them by the month when they start.
      const normalizedPhases = Array.from(
        incomePhases.reduce((phaseMap, phase) => {
          if (
            phase.month === "" ||
            (phase.income === "" && phase.expense === "") ||
            !/^\d{4}-\d{2}$/.test(phase.month)
          ) {
            return phaseMap;
          }

          const startMonthOffset = Math.min(Math.max(1, monthOffset(startYYYYMM, phase.month)), months);
          const phaseIncome = phase.income === "" ? null : Number(phase.income);
          const phaseExpense = phase.expense === "" ? null : Number(phase.expense);

          if (
            (phaseIncome !== null && !Number.isFinite(phaseIncome)) ||
            (phaseExpense !== null && !Number.isFinite(phaseExpense))
          ) {
            return phaseMap;
          }

          phaseMap.set(startMonthOffset, { income: phaseIncome, expense: phaseExpense });
          return phaseMap;
        }, new Map())
      )
        .map(([startMonthOffset, values]) => ({ startMonthOffset, ...values }))
        .sort((left, right) => left.startMonthOffset - right.startMonthOffset);
    const rows = [];
    let currentIncome = income;
    let currentExpense = expense;

    // Apply each change from its selected month, then calculate the balance.
    for (let i = 1; i <= months; i++) {
      normalizedPhases
        .filter((phase) => phase.startMonthOffset === i)
        .forEach((phase) => {
          if (phase.income !== null) currentIncome = phase.income;
          if (phase.expense !== null) currentExpense = phase.expense;
        });
      const monthlyBalance = currentIncome - currentExpense;
      const prevSavings = i === 1 ? initial : rows[i - 2].savings;
      rows.push({
        month: addSimMonth(startYYYYMM, i),
        monthlyBalance,
        savings: prevSavings + monthlyBalance
      });
    }
      return rows;
    } catch (err) {
      logError("SavingsSimulationPanel.simResult", err);
      return [];
    }
  }, [currentSavings, incomePhases, monthlyExpense, monthlyIncome, simMonths]);

  try {
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

      <br />

      <div className="savings-sim-phase-list">
        <div className="savings-sim-phase-toolbar">
          <p className="savings-sim-phase-title">{t.savingsSimIncomeChangesLabel}</p>
        </div>

        <p className="subtext savings-sim-phase-help">{t.savingsSimIncomeChangesHelp}</p>

        <div className="savings-sim-phase-head" aria-hidden="true">
          <span>{t.savingsSimChangeMonthLabel}</span>
          <span>{t.savingsSimIncomeChangeAmountLabel}</span>
          <span>{t.savingsSimExpenseChangeAmountLabel}</span>
          <span>{t.actionsLabel}</span>
        </div>
        
        {incomePhases.map((phase, index) => (
          <div key={phase.id} className="savings-sim-phase-row">
            <label className="savings-sim-phase-cell">
              <input
                type="month"
                value={phase.month}
                aria-label={t.savingsSimIncomeChangeAfterLabel.replace("{index}", String(index + 1))}
                onChange={(e) => handleIncomePhaseChange(phase.id, "month", e.target.value)}
              />
            </label>

            <label className="savings-sim-phase-cell">
              <input
                type="text"
                inputMode="decimal"
                value={formatNumericInput(phase.income)}
                aria-label={`${t.savingsSimIncomeChangeAmountLabel} ${index + 1}`}
                onChange={(e) => handleIncomePhaseChange(phase.id, "income", e.target.value)}
                placeholder="0"
              />
            </label>

            <label className="savings-sim-phase-cell">
              <input
                type="text"
                inputMode="decimal"
                value={formatNumericInput(phase.expense)}
                aria-label={`${t.savingsSimExpenseChangeAmountLabel} ${index + 1}`}
                onChange={(e) => handleIncomePhaseChange(phase.id, "expense", e.target.value)}
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

      <div className="savings-sim-actions">
        <button
          type="button"
          className="secondary-button savings-sim-phase-add"
          onClick={handleAddIncomePhase}
        >
          {t.savingsSimAddIncomeChange}
        </button>
        {safeAnnualRows.length > 0 && (
          <button type="button" className="secondary-button savings-sim-autofill" onClick={handleAutoFill}>
            {t.savingsSimAutoFill}
          </button>
        )}
      </div>

      <br />

      {simResult.length === 0 ? (
        <p className="subtext savings-sim-empty">{t.savingsSimNoData}</p>
      ) : (
        <>
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
  } catch (err) {
    logError("SavingsSimulationPanel.render", err);
    return (
      <section className="card savings-sim-panel">
        <p className="error">{t?.errorUnexpectedMessage || "An unexpected error occurred while displaying the savings simulation panel."}</p>
      </section>
    );
  }
}
