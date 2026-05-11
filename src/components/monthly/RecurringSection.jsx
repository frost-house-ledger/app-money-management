import React from "react";
import { formatCurrency, formatNumericInput, sanitizeNumericInput } from "../../lib/currency.js";

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
  return (
    <form className="card" onSubmit={onSubmit}>
      <h2>{t.recurringFormTitle}</h2>
      <p className="subtext">{t.recurringFormSubtext}</p>

      <label>
        {t.typeLabel}
        <select
          value={recurringForm.type}
          onChange={(e) => {
            const nextType = e.target.value;
            setRecurringForm((curr) => ({
              ...curr,
              type: nextType,
              categoryId: nextType === "fee" ? curr.categoryId || dailyCategoryOptions[0]?.id || "other" : ""
            }));
          }}
        >
          <option value="fee">{t.typeFee}</option>
          <option value="income">{t.typeIncome}</option>
        </select>
      </label>

      <label>
        {t.categoryLabel}
        <select
          value={recurringForm.categoryId || ""}
          onChange={(e) => setRecurringForm((curr) => ({ ...curr, categoryId: e.target.value }))}
          disabled={recurringForm.type !== "fee"}
        >
          {dailyCategoryOptions.map((category) => (
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
          value={recurringForm.title}
          onChange={(e) => setRecurringForm((curr) => ({ ...curr, title: e.target.value }))}
          placeholder={t.recurringTitlePlaceholder}
        />
      </label>

      <label>
        {t.amountLabel}
        <input
          type="text"
          inputMode="decimal"
          value={formatNumericInput(recurringForm.amount)}
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
          value={recurringForm.startMonth}
          onChange={(e) => setRecurringForm((curr) => ({ ...curr, startMonth: e.target.value }))}
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
}

export function RecurringListSection({
  filteredRecurring,
  recurringTitle,
  selectedCurrency,
  onEditRecurring,
  exchangeRates,
  t
}) {
  return (
    <article className="card">
      <h2>{recurringTitle}</h2>
      <ul className="list recurring-list">
        {filteredRecurring.map((row) => (
          <li key={`rec-${row.id}`} className="recurring-list-item">
            <strong>{row.startMonth}</strong>
            <span>{row.type}</span>
            <span>
              {row.type === "fee" ? `${row.categoryIcon || "🏷️"} ${row.categoryDisplay || "-"}` : "-"}
            </span>
            <span>{row.title}</span>
            <span>{formatCurrency(row.amount, selectedCurrency, exchangeRates)}</span>
            <button type="button" className="inline-action" onClick={() => onEditRecurring(row)}>
              {t.editRecurringButton}
            </button>
          </li>
        ))}
      </ul>
    </article>
  );
}
