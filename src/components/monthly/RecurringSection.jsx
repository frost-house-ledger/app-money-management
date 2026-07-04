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
          <h2>{t.recurringFormTitle || "固定費／給料"}</h2>
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

          <label>
            {t.frequencyLabel || "周期"}
            <select
              value={rf.frequency || "monthly"}
              onChange={(e) => setRecurringForm((curr) => ({ ...curr, frequency: e.target.value }))}
            >
              <option value="monthly">{t.frequencyMonthly || "月次"}</option>
              <option value="annual">{t.frequencyAnnual || "年次"}</option>
            </select>
          </label>

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

          <label>
            {t.noteLabel}
            <input
              type="text"
              value={rf.note || ''}
              onChange={(e) => setRecurringForm((curr) => ({ ...curr, note: e.target.value }))}
              placeholder={t.dailyNotePlaceholder}
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
      frequency: "monthly",
      note: ""
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

      function openFullPageEditor(initial) {
        try {
          const draft = { id: inlineEditId, ...initial };
          try { sessionStorage.setItem('monthlyEditDraft', JSON.stringify(draft)); } catch (e) { /* ignore */ }
          const id = inlineEditId || '';
          // navigate in the same tab to keep the app DOM (and jeep-sqlite element) available
          window.location.hash = `/monthly/edit${id ? `?id=${encodeURIComponent(id)}` : ''}`;
        } catch (error) {
          logError('RecurringListSection.openFullPageEditor', error);
          setInlineError(t.errorRecurringOpenEditor || 'Failed to open editor');
        }
      }

    React.useEffect(() => {
      const rowIds = new Set(safeFilteredRecurring.map((row) => row.id));
      setPendingDeleteIds((current) => current.filter((id) => rowIds.has(id)));
    }, [filteredRecurring]);

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

          <table className="app-table recurring-table">
            <thead>
              <tr>
                <th>{t.actionsLabel || "Actions"}</th>
                <th>{t.recurringStartMonthLabel}</th>
                <th>{t.recurringEndMonthLabel}</th>
                <th>{t.typeLabel}</th>
                <th>{t.frequencyLabel}</th>
                <th>{t.categoryLabel}</th>
                <th>{t.titleLabel}</th>
                <th>{t.noteLabel}</th>
                <th style={{ textAlign: "right" }}>{t.amountLabel}</th>
              </tr>
            </thead>
            <tbody>
              {safeFilteredRecurring.map((row) => {
                const isPendingDelete = pendingDeleteIds.includes(row.id);
                const isExpired = isExpiredRecurring(row);
                return (
                  <tr
                    key={`rec-${row.id}`}
                    className={`${inlineEditId === row.id ? "recurring-list-item--editing" : ""} ${isPendingDelete ? "recurring-list-item--pending-delete" : ""} ${isExpired ? "recurring-list-item--expired" : ""}`}
                  >
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isPendingDelete ? (
                        <button className="inline-action" onClick={() => cancelPendingDelete(row.id)}>{t.restoreButton}</button>
                      ) : (
                        <>
                          <button className="inline-action" onClick={() => openFullPageEditor(row)}>{t.editRecurringButton}</button>
                          <button className="inline-action danger-action" onClick={() => requestDelete(row.id)}>{t.deleteRecurringButton}</button>
                        </>
                      )}
                    </td>
                    {inlineEditId === row.id ? (
                      <>
                        <td><input type="month" value={inlineForm.startMonth} onChange={(e) => setInlineForm((c) => ({ ...c, startMonth: e.target.value }))} /></td>
                        <td><input type="month" value={inlineForm.endMonth || ""} onChange={(e) => setInlineForm((c) => ({ ...c, endMonth: e.target.value }))} /></td>
                        <td>
                          <select value={inlineForm.type} onChange={(e) => { const next = e.target.value; setInlineForm((c) => ({ ...c, type: next, categoryId: next === 'fee' ? c.categoryId || dailyCategoryOptions[0]?.id || 'food' : '' })); }}>
                            <option value="fee">{t.typeFee}</option>
                            <option value="income">{t.typeIncome}</option>
                          </select>
                        </td>
                        <td>
                          <select value={inlineForm.frequency || 'monthly'} onChange={(e) => setInlineForm((c) => ({ ...c, frequency: e.target.value }))}>
                            <option value="monthly">{t.frequencyMonthly || '月次'}</option>
                            <option value="annual">{t.frequencyAnnual || '年次'}</option>
                          </select>
                        </td>
                        <td>
                          <select value={inlineForm.categoryId || ''} onChange={(e) => setInlineForm((c) => ({ ...c, categoryId: e.target.value }))} disabled={inlineForm.type !== 'fee'}>
                            {dailyCategoryOptions.map((cat) => <option key={cat.id} value={cat.id}>{cat.icon || '🏷️'} {cat.label}</option>)}
                          </select>
                        </td>
                        <td><input type="text" value={inlineForm.title} onChange={(e) => setInlineForm((c) => ({ ...c, title: e.target.value }))} placeholder={t.recurringTitlePlaceholder} /></td>
                        <td style={{ textAlign: 'right' }}><input type="text" inputMode="decimal" value={formatNumericInput(inlineForm.amount)} onChange={(e) => setInlineForm((c) => ({ ...c, amount: sanitizeNumericInput(e.target.value) }))} placeholder={t.recurringAmountPlaceholder} /></td>
                        <td><input type="text" value={inlineForm.note || ''} onChange={(e) => setInlineForm((c) => ({ ...c, note: e.target.value }))} placeholder={t.dailyNotePlaceholder} /></td>
                      </>
                    ) : (
                      <>
                        <td>{row.startMonth}</td>
                        <td>{row.endMonth || '-'}</td>
                        <td>{row.type}</td>
                        <td>{row.frequency === 'annual' ? (t.frequencyAnnual || '年次') : row.frequency === 'monthly' ? (t.frequencyMonthly || '月次') : '-'}</td>
                        <td>{row.type === 'fee' ? `${row.categoryIcon || '🏷️'} ${row.categoryDisplay || '-'}` : '-'}</td>
                        <td>{row.title}{row.type === 'income' && row.isSalary ? <span style={{ marginLeft: 6 }}>💼</span> : null}</td>
                        <td>{row.note ? (row.note.length > 40 ? row.note.slice(0,40) + '…' : row.note) : '-'}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(row.amount, selectedCurrency, exchangeRates)}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
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
