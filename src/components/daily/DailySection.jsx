import React from "react";
import { formatCurrency, formatNumericInput, sanitizeNumericInput } from "../../lib/currency.js";

// This section includes both the form and the list, as they are closely related and likely to be used together. The form state is lifted up to avoid unnecessary re-renders of the list when the form state changes.
export default function DailySection({
  dailyForm,
  setDailyForm,
  onSubmit,
  editingDailyId,
  onCancelDailyEdit,
  dailyCategoryOptions,
  t
}) {
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
          value={dailyForm.categoryId}
          onChange={(e) => setDailyForm((curr) => ({ ...curr, categoryId: e.target.value }))}
          disabled={dailyForm.type !== "fee"}
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
          value={dailyForm.title}
          onChange={(e) => setDailyForm((curr) => ({ ...curr, title: e.target.value }))}
          placeholder={t.dailyTitlePlaceholder}
        />
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
  dailyTitle,
  selectedCurrency,
  exchangeRates,
  onEditDaily,
  onDeleteDaily,
  t
}) {
  const totalFee = dailyRows
    .filter((row) => row.type === "fee")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const totalIncome = dailyRows
    .filter((row) => row.type === "income")
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <article className="card">
      <h2>{dailyTitle}</h2>
      <ul className="list daily-list">
        {dailyRows.map((row) => (
          <li key={`daily-${row.id}`} className="daily-list-item">
            <strong>{row.entryDate}</strong>
            <span>{row.type}</span>
            <span>
              {row.categoryDisplay ? `${row.categoryIcon || "🏷️"} ${row.categoryDisplay}` : "-"}
            </span>
            <span>{row.title}</span>
            <span>{formatCurrency(row.amount, selectedCurrency, exchangeRates)}</span>
            <span className="daily-row-actions">
              <button
                type="button"
                className="inline-action"
                onClick={() => onEditDaily(row)}
              >
                {t.editDailyButton}
              </button>
              <button
                type="button"
                className="inline-action danger-action"
                onClick={() => onDeleteDaily(row.id)}
              >
                {t.deleteButton}
              </button>
            </span>
          </li>
        ))}
      </ul>
      {dailyRows.length > 0 && (
        <div className="daily-totals">
          {totalFee > 0 && (
            <span className="daily-total-fee">費用合計: {formatCurrency(totalFee, selectedCurrency, exchangeRates)}</span>
          )}
          {totalIncome > 0 && (
            <span className="daily-total-income">収入合計: {formatCurrency(totalIncome, selectedCurrency, exchangeRates)}</span>
          )}
        </div>
      )}
    </article>
  );
}
