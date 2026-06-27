import React from "react";
import {
  formatBaseAmountForInput,
  formatCurrency,
  formatNumericInput,
  sanitizeNumericInput
} from "../../lib/currency.js";
import { logError } from "../../lib/logger.js";

// This section includes both the form and the list, as they are closely related and likely to be used together. The form state is lifted up to avoid unnecessary re-renders of the list when the form state changes.
export default function DailySection({
  dailyForm,
  setDailyForm,
  onSubmit,
  editingDailyId,
  onCancelDailyEdit,
  dailyCategoryOptions,
  dailyTitleSuggestions,
  t
}) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const sortedTitleSuggestions = React.useMemo(() => {
    try {
      return Array.from(new Set(dailyTitleSuggestions)).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
    } catch (e) {
      logError("DailySection.sortedTitleSuggestions", e);
      return dailyTitleSuggestions.slice().sort();
    }
  }, [dailyTitleSuggestions]);

  const filteredTitleSuggestions = React.useMemo(() => {
    const q = (dailyForm.title || "").trim().toLowerCase();
    if (!q) return sortedTitleSuggestions;
    return sortedTitleSuggestions.filter((s) => s.toLowerCase().includes(q));
  }, [dailyForm.title, sortedTitleSuggestions]);
    // return the form part here, and the list part is moved to DailyListSection to avoid re-rendering the list when the form state changes
  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>{t.dailyFormTitle}</h2>
      <p className="subtext">{t.dailyFormSubtext}</p>

      <label>
        {t.typeLabel}
        <select
          value={dailyForm.type}
          onChange={(e) => {
            const nextType = e.target.value;
            setDailyForm((curr) => ({
              ...curr,
              type: nextType,
              categoryId: nextType === "fee" ? curr.categoryId || dailyCategoryOptions[0]?.id || "food" : ""
            }));
          }}
        >
          <option value="fee">{t.typeFee}</option>
          <option value="income">{t.typeIncome}</option>
        </select>
      </label>

      {/* category selection */}
      <label>
        {t.categoryLabel}
        <select
          value={dailyForm.categoryId || ""}
          onChange={(e) => setDailyForm((curr) => ({ ...curr, categoryId: e.target.value }))}
          disabled={dailyForm.type !== "fee"}
        >
          {dailyCategoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.icon || "🍽️"} {category.label}
            </option>
          ))}
        </select>
      </label>
      
      {/* daily title input such as supermarket, restaurant, etc. */}
      <label style={{ position: "relative" }}>
        {t.titleLabel}
        <input
          type="text"
          autoComplete="on"
          value={dailyForm.title}
          onChange={(e) => {
            const v = e.target.value;
            setDailyForm((curr) => ({ ...curr, title: v }));
            setShowSuggestions(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (filteredTitleSuggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            // delay hiding so click events on suggestions register
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          onKeyDown={(e) => {
            if (!filteredTitleSuggestions || filteredTitleSuggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setShowSuggestions(true);
              setHighlightedIndex((i) => Math.min(i + 1, filteredTitleSuggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightedIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              if (showSuggestions && highlightedIndex >= 0) {
                e.preventDefault();
                const sel = filteredTitleSuggestions[highlightedIndex];
                if (sel) {
                  setDailyForm((curr) => ({ ...curr, title: sel }));
                }
                setShowSuggestions(false);
              }
            } else if (e.key === "Escape") {
              setShowSuggestions(false);
            }
          }}
          placeholder={t.dailyTitlePlaceholder}
        />

        {showSuggestions && filteredTitleSuggestions.length > 0 && (
          <div
            role="listbox"
            aria-label={t.titleLabel}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              zIndex: 100,
              border: "1px solid var(--line)",
              background: "var(--bg-1)",
              color: "var(--ink)",
              maxHeight: 160,
              overflow: "auto"
            }}
          >
            {filteredTitleSuggestions.map((s, idx) => (
              <div
                key={s}
                role="option"
                aria-selected={highlightedIndex === idx}
                onMouseDown={(ev) => {
                  // prevent blur before click
                  ev.preventDefault();
                }}
                onClick={() => {
                  setDailyForm((curr) => ({ ...curr, title: s }));
                  setShowSuggestions(false);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  padding: "6px 8px",
                  cursor: "pointer",
                  background: highlightedIndex === idx ? "var(--card)" : "transparent"
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </label>

      <label>
        {t.amountLabel}
        <input
          type="text"
          inputMode="decimal"
          value={formatNumericInput(dailyForm.amount)}
          onChange={(e) =>
            setDailyForm((curr) => ({ ...curr, amount: sanitizeNumericInput(e.target.value) }))
          }
          placeholder={t.dailyAmountPlaceholder}
        />
      </label>

      <label>
        {t.dateLabel}
        <input
          type="date"
          value={dailyForm.entryDate}
          onChange={(e) => setDailyForm((curr) => ({ ...curr, entryDate: e.target.value }))}
        />
      </label>

      <label>
        {t.noteLabel}
        <input
          type="text"
          value={dailyForm.note}
          onChange={(e) => setDailyForm((curr) => ({ ...curr, note: e.target.value }))}
          placeholder={t.dailyNotePlaceholder}
        />
      </label>

      <button type="submit">
        {editingDailyId ? t.updateDailyButton : t.saveDailyButton}
      </button>
      {editingDailyId && (
        <button type="button" className="secondary-button" onClick={onCancelDailyEdit}>
          {t.cancelEditButton}
        </button>
      )}
    </form>
  );
}

// Separate section for the daily entries list, to avoid re-rendering the list when the form state changes
export function DailyListSection({
  dailyRows,
  filteredRecurring,
  dailyTitle,
  dailyCategoryOptions,
  selectedCurrency,
  exchangeRates,
  onUpdateDailyInline,
  onDeleteDaily,
  selectedMonth,
  t
}) {
  const [inlineEditId, setInlineEditId] = React.useState(null);
  const [inlineForm, setInlineForm] = React.useState({
    type: "fee",
    categoryId: dailyCategoryOptions[0]?.id || "food",
    title: "",
    amount: "",
    entryDate: "",
    note: ""
  });
  const [inlineError, setInlineError] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = React.useState([]);
  const pendingDeleteTimersRef = React.useRef(new Map());

  React.useEffect(() => {
    return () => {
      pendingDeleteTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      pendingDeleteTimersRef.current.clear();
    };
  }, []);

  React.useEffect(() => {
    const rowIds = new Set(dailyRows.map((row) => row.id));
    setPendingDeleteIds((current) => current.filter((id) => rowIds.has(id)));
  }, [dailyRows]);

  function startInlineEdit(row) {
    setInlineError("");
    setInlineEditId(row.id);
    setInlineForm({
      type: row.type,
      categoryId: (row.categoryId || dailyCategoryOptions[0]?.id || "food").toLowerCase(),
      title: row.title || "",
      amount: formatBaseAmountForInput(row.amount, selectedCurrency, exchangeRates),
      entryDate: row.entryDate || "",
      note: row.note || ""
    });
  }

  function cancelInlineEdit() {
    setInlineEditId(null);
    setInlineError("");
    setInlineForm({
      type: "fee",
      categoryId: dailyCategoryOptions[0]?.id || "food",
      title: "",
      amount: "",
      entryDate: "",
      note: ""
    });
  }

  async function submitInlineEdit() {
    setInlineError("");
    setIsSaving(true);
    try {
      await onUpdateDailyInline({
        id: inlineEditId,
        ...inlineForm,
        categoryId: inlineForm.type === "fee" ? inlineForm.categoryId || "food" : null
      });
      cancelInlineEdit();
    } catch (error) {
      logError("DailyListSection.submitInlineEdit", error);
      setInlineError(error.message || t.errorDailyFailed);
    } finally {
      setIsSaving(false);
    }
  }

  function cancelPendingDelete(id) {
    const timerId = pendingDeleteTimersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      pendingDeleteTimersRef.current.delete(id);
    }
    setPendingDeleteIds((current) => current.filter((item) => item !== id));
  }

  function requestDelete(id) {
    if (pendingDeleteTimersRef.current.has(id)) {
      return;
    }

    if (inlineEditId === id) {
      cancelInlineEdit();
    }

    setPendingDeleteIds((current) => [...current, id]);

    const timerId = window.setTimeout(async () => {
      try {
        await onDeleteDaily(id);
      } catch (error) {
        logError("DailyListSection.requestDelete", error);
        setInlineError(error.message || t.errorDailyDeleteFailed);
      } finally {
        pendingDeleteTimersRef.current.delete(id);
        setPendingDeleteIds((current) => current.filter((item) => item !== id));
      }
    }, 30000);

    pendingDeleteTimersRef.current.set(id, timerId);
  }


  // limit dailyRows to the selected month
  const monthPrefix = selectedMonth || (new Date().toISOString().slice(0, 7));
  const filteredDailyRows = dailyRows.filter(row =>
    row.entryDate && row.entryDate.startsWith(monthPrefix)
  );
  const filteredRecurringRows = (filteredRecurring || []).filter(row =>
    row.startMonth <= monthPrefix && (!row.endMonth || monthPrefix <= row.endMonth)
  );

  const dailyFee = filteredDailyRows.filter(row => row.type === "fee").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const dailyIncome = filteredDailyRows.filter(row => row.type === "income").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const recurringFee = filteredRecurringRows.filter(row => row.type === "fee").reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const recurringIncome = filteredRecurringRows.filter(row => row.type === "income").reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const totalFee = dailyFee + recurringFee;
  const totalIncome = dailyIncome + recurringIncome;

  return (
    <article className="card">
      <h2>{dailyTitle}</h2>
      {inlineError && <p className="error">{inlineError}</p>}
      <ul className="list daily-list">
        {dailyRows.map((row) => {
          const isPendingDelete = pendingDeleteIds.includes(row.id);
          return (
          <li
            key={`daily-${row.id}`}
            className={`daily-list-item ${inlineEditId === row.id ? "daily-list-item--editing" : ""} ${isPendingDelete ? "daily-list-item--pending-delete" : ""}`}
          >
            {inlineEditId === row.id ? (
              <>
                <label>
                  <input
                    type="date"
                    value={inlineForm.entryDate}
                    onChange={(e) => setInlineForm((current) => ({ ...current, entryDate: e.target.value }))}
                  />
                </label>
                <label>
                  <select
                    value={inlineForm.type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setInlineForm((current) => ({
                        ...current,
                          type: nextType,
                          categoryId: nextType === "fee" ? current.categoryId || dailyCategoryOptions[0]?.id || "food" : ""
                      }));
                    }}
                  >
                    <option value="fee">{t.typeFee}</option>
                    <option value="income">{t.typeIncome}</option>
                  </select>
                </label>
                <label>
                  <select
                    value={inlineForm.categoryId || ""}
                    onChange={(e) => setInlineForm((current) => ({ ...current, categoryId: e.target.value }))}
                    disabled={inlineForm.type !== "fee"}
                  >
                    {dailyCategoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon || "🍽️"} {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <input
                    type="text"
                    value={inlineForm.title}
                    onChange={(e) => setInlineForm((current) => ({ ...current, title: e.target.value }))}
                    placeholder={t.dailyTitlePlaceholder}
                  />
                </label>
                <label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatNumericInput(inlineForm.amount)}
                    onChange={(e) =>
                      setInlineForm((current) => ({ ...current, amount: sanitizeNumericInput(e.target.value) }))
                    }
                    placeholder={t.dailyAmountPlaceholder}
                  />
                </label>
                <label>
                  <input
                    type="text"
                    value={inlineForm.note}
                    onChange={(e) => setInlineForm((current) => ({ ...current, note: e.target.value }))}
                    placeholder={t.dailyNotePlaceholder}
                  />
                </label>
                <span className="daily-row-actions">
                  <button
                    type="button"
                    className="inline-action"
                    onClick={submitInlineEdit}
                    disabled={isSaving}
                  >
                    {t.updateDailyButton}
                  </button>
                  <button
                    type="button"
                    className="inline-action"
                    onClick={cancelInlineEdit}
                    disabled={isSaving}
                  >
                    {t.cancelEditButton}
                  </button>
                </span>
              </>
            ) : (
              <>
                <strong>{row.entryDate}</strong>
                <span>{row.type}</span>
                <span>
                  {row.categoryDisplay ? `${row.categoryIcon || "🍽️"} ${row.categoryDisplay}` : "-"}
                </span>
                <span>{row.title}</span>
                <span>{formatCurrency(row.amount, selectedCurrency, exchangeRates)}</span>
                <span>{row.note || "-"}</span>
                <span className="daily-row-actions">
                  {isPendingDelete ? (
                    <button
                      type="button"
                      className="inline-action"
                      onClick={() => cancelPendingDelete(row.id)}
                    >
                      {t.restoreButton}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="inline-action"
                        onClick={() => startInlineEdit(row)}
                      >
                        {t.editDailyButton}
                      </button>
                      <button
                        type="button"
                        className="inline-action danger-action"
                        onClick={() => requestDelete(row.id)}
                      >
                        {t.deleteButton}
                      </button>
                    </>
                  )}
                </span>
              </>
            )}
          </li>
          );
        })}
      </ul>
      {(dailyRows.length > 0 || (filteredRecurring && filteredRecurring.length > 0)) && (
        <div className="daily-totals">
          {totalFee > 0 && (
            <span className="daily-total-fee">{t.monthlyExpenseTotal}: {formatCurrency(totalFee, selectedCurrency, exchangeRates)}</span>
          )}
          {totalIncome > 0 && (
            <span className="daily-total-income">{t.monthlyIncomeTotal}: {formatCurrency(totalIncome, selectedCurrency, exchangeRates)}</span>
          )}
        </div>
      )}
    </article>
  );
}
