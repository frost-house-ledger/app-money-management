import React from "react";
import {
  formatBaseAmountForInput,
  formatCurrency,
  formatNumericInput,
  sanitizeNumericInput
} from "../../lib/currency.js";
import { thisMonth } from "../../lib/date.js";
import { logError } from "../../lib/logger.js";

export default function RecurringSection({
  recurringForm,
  setRecurringForm,
  onSubmit,
  currentYYYYMM,
  editingRecurringId,
  onCancelEdit,
  dailyCategoryOptions,
  t
}) {
  try {
    const safeDailyCategoryOptions = Array.isArray(dailyCategoryOptions) ? dailyCategoryOptions : [];
    const rf = recurringForm || {};

    return (
      <form className="card" onSubmit={onSubmit}>
        <h2>{t.recurringFormTitle}</h2>
        <p className="subtext">{t.recurringFormSubtext}</p>

        <label>
          {t.typeLabel}
          <select
            value={rf.type}
            onChange={(e) => {
              const nextType = e.target.value;
              setRecurringForm((curr) => ({
                ...curr,
                type: nextType,
                categoryId: nextType === "fee" ? curr.categoryId || safeDailyCategoryOptions[0]?.id || "food" : "🍽️"
              }));
            }}
          >
            <option value="fee">{t.typeFee}</option>
            <option value="income">{t.typeIncome}</option>
          </select>
        </label>

        {rf.type === "income" && (
          <label>
            {t.recurringIsSalaryLabel || "This is salary"}
            <input
              type="checkbox"
              checked={Boolean(rf.isSalary)}
              onChange={(e) => setRecurringForm((curr) => ({ ...curr, isSalary: Boolean(e.target.checked) }))}
            />
          </label>
        )}

        <label>
          {t.categoryLabel}
          <select
            value={rf.categoryId || ""}
            onChange={(e) => setRecurringForm((curr) => ({ ...curr, categoryId: e.target.value }))}
            disabled={rf.type !== "fee"}
          >
            {safeDailyCategoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon || "🏷️"} {category.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t.titleLabel}
          <input
            type="text"
            value={rf.title}
            onChange={(e) => setRecurringForm((curr) => ({ ...curr, title: e.target.value }))}
            placeholder={t.recurringTitlePlaceholder}
          />
        </label>

        <label>
          {t.amountLabel}
          <input
            type="text"
            inputMode="decimal"
            value={formatNumericInput(rf.amount)}
            onChange={(e) =>
              setRecurringForm((curr) => ({ ...curr, amount: sanitizeNumericInput(e.target.value) }))
            }
            placeholder={t.recurringAmountPlaceholder}
          />
        </label>

        <label>
          {t.recurringStartMonthLabel}
          <input
            type="month"
            value={rf.startMonth}
            onChange={(e) => setRecurringForm((curr) => ({ ...curr, startMonth: e.target.value }))}
            placeholder={currentYYYYMM}
          />
        </label>

        <label>
          {t.recurringEndMonthLabel}
          <input
            type="month"
            value={rf.endMonth || ""}
            onChange={(e) => setRecurringForm((curr) => ({ ...curr, endMonth: e.target.value }))}
            placeholder={currentYYYYMM}
          />
        </label>

        <div className="form-actions">
          <button type="submit">
            {editingRecurringId ? t.updateRecurringButton : t.saveRecurringButton}
          </button>
          {editingRecurringId && (
            <button type="button" className="secondary-button" onClick={onCancelEdit}>
              {t.cancelEditButton}
            </button>
          )}
        </div>
      </form>
    );
  } catch (err) {
    logError("RecurringSection.render", err);
    return (
      <form className="card">
        <p className="error">{t?.errorUnexpectedMessage || "表示中にエラーが発生しました"}</p>
      </form>
    );
  }
}

export function RecurringListSection({
  filteredRecurring,
  recurringTitle,
  dailyCategoryOptions,
  selectedCurrency,
  onEditRecurring,
  onUpdateRecurringInline,
  onDeleteRecurring,
  exchangeRates,
  t
}) {
  const [inlineEditId, setInlineEditId] = React.useState(null);
  const [inlineForm, setInlineForm] = React.useState({
    type: "fee",
    categoryId: "food",
    title: "",
    amount: "",
    startMonth: "",
    endMonth: "",
    isSalary: false
  });
  const [inlineError, setInlineError] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = React.useState([]);
  const pendingDeleteTimersRef = React.useRef(new Map());
  const currentMonth = React.useMemo(() => thisMonth(), []);
  const safeFilteredRecurring = Array.isArray(filteredRecurring) ? filteredRecurring : [];
  const safeDailyCategoryOptions = Array.isArray(dailyCategoryOptions) ? dailyCategoryOptions : [];

  function isExpiredRecurring(row) {
    return Boolean(row.endMonth) && row.endMonth < currentMonth;
  }

  React.useEffect(() => {
    return () => {
      pendingDeleteTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      pendingDeleteTimersRef.current.clear();
    };
  }, []);

  React.useEffect(() => {
    const rowIds = new Set(safeFilteredRecurring.map((row) => row.id));
    setPendingDeleteIds((current) => current.filter((id) => rowIds.has(id)));
  }, [filteredRecurring]);

  function startInlineEdit(row) {
    setInlineError("");
    setInlineEditId(row.id);
    setInlineForm({
      type: row.type,
      categoryId: row.categoryId || "food",
      title: row.title || "",
      amount: formatBaseAmountForInput(row.amount, selectedCurrency, exchangeRates),
      startMonth: row.startMonth || "",
      endMonth: row.endMonth || "",
      isSalary: Boolean(row.isSalary)
    });
  }

  function cancelInlineEdit() {
    setInlineEditId(null);
    setInlineError("");
    setInlineForm({
      type: "fee",
      categoryId: "food",
      title: "",
      amount: "",
      startMonth: "",
      endMonth: "",
      isSalary: false
    });
  }

  async function submitInlineEdit() {
    setInlineError("");
    setIsSaving(true);
    try {
      await onUpdateRecurringInline({
        id: inlineEditId,
        ...inlineForm,
        endMonth: inlineForm.endMonth || null,
        categoryId: inlineForm.type === "fee" ? inlineForm.categoryId || "food" : null
      });
      cancelInlineEdit();
    } catch (error) {
      logError("RecurringListSection.submitInlineEdit", error);
      setInlineError(error.message || t.errorRecurringFailed);
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
        await onDeleteRecurring(id);
      } catch (error) {
        logError("RecurringListSection.requestDelete", error);
        setInlineError(error.message || t.errorRecurringDeleteFailed);
      } finally {
        pendingDeleteTimersRef.current.delete(id);
        setPendingDeleteIds((current) => current.filter((item) => item !== id));
      }
    }, 30000);

    pendingDeleteTimersRef.current.set(id, timerId);
  }

  try {
    return (
      <article className="card">
        <h2>{recurringTitle}</h2>
        {inlineError && <p className="error">{inlineError}</p>}
        <ul className="list recurring-list">
          {safeFilteredRecurring.map((row) => {
          const isPendingDelete = pendingDeleteIds.includes(row.id);
          const isExpired = isExpiredRecurring(row);
          return (
          <li
            key={`rec-${row.id}`}
            className={`recurring-list-item ${inlineEditId === row.id ? "recurring-list-item--editing" : ""} ${isPendingDelete ? "recurring-list-item--pending-delete" : ""} ${isExpired ? "recurring-list-item--expired" : ""}`}
          >
            {inlineEditId === row.id ? (
              <>
                <label>
                  <input
                    type="month"
                    value={inlineForm.startMonth}
                    onChange={(e) => setInlineForm((current) => ({ ...current, startMonth: e.target.value }))}
                  />
                </label>
                <label>
                  <input
                    type="month"
                    value={inlineForm.endMonth || ""}
                    onChange={(e) => setInlineForm((current) => ({ ...current, endMonth: e.target.value }))}
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
                        {category.icon || "🏷️"} {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                {inlineForm.type === "income" && (
                  <label>
                    {t.recurringIsSalaryLabel || "This is salary"}
                    <input
                      type="checkbox"
                      checked={Boolean(inlineForm.isSalary)}
                      onChange={(e) => setInlineForm((current) => ({ ...current, isSalary: Boolean(e.target.checked) }))}
                    />
                  </label>
                )}
                <label>
                  <input
                    type="text"
                    value={inlineForm.title}
                    onChange={(e) => setInlineForm((current) => ({ ...current, title: e.target.value }))}
                    placeholder={t.recurringTitlePlaceholder}
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
                    placeholder={t.recurringAmountPlaceholder}
                  />
                </label>
                <span className="daily-row-actions">
                  <button
                    type="button"
                    className="inline-action"
                    onClick={submitInlineEdit}
                    disabled={isSaving}
                  >
                    {t.updateRecurringButton}
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
                <strong>{row.startMonth}</strong>
                <span>
                  {row.endMonth || "-"}
                  {isExpired && (
                    <span
                      className="recurring-expired-indicator"
                      title={t.recurringExpiredLabel}
                      aria-label={t.recurringExpiredLabel}
                    >
                      ⚠
                    </span>
                  )}
                </span>
                <span>{row.type}</span>
                <span>
                  {row.type === "fee" ? `${row.categoryIcon || "🏷️"} ${row.categoryDisplay || "-"}` : "-"}
                </span>
                <span>{row.title}</span>
                {row.type === "income" && row.isSalary && (
                  <span title={t.recurringIsSalaryLabel || "Salary"} style={{ marginLeft: 6 }}>💼</span>
                )}
                <span>{formatCurrency(row.amount, selectedCurrency, exchangeRates)}</span>
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
                      <button type="button" className="inline-action" onClick={() => startInlineEdit(row)}>
                        {t.editRecurringButton}
                      </button>
                      <button
                        type="button"
                        className="inline-action danger-action"
                        onClick={() => requestDelete(row.id)}
                      >
                        {t.deleteRecurringButton}
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
      </article>
    );
  } catch (err) {
    logError("RecurringListSection.render", err);
    return (
      <article className="card">
        <p className="error">{t?.errorUnexpectedMessage || "表示中にエラーが発生しました"}</p>
      </article>
    );
  }
}
