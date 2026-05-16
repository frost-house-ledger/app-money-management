import React from "react";
import RecurringSection, { RecurringListSection } from "./RecurringSection.jsx";

export default function MonthlyEntryPage({
  recurringForm,
  setRecurringForm,
  onSubmitRecurring,
  currentYYYYMM,
  editingRecurringId,
  onCancelRecurringEdit,
  dailyCategoryOptions,
  filteredRecurring,
  selectedCurrency,
  exchangeRates,
  onEditRecurring,
  onUpdateRecurringInline,
  onDeleteRecurring,
  t
}) {
  return (
    <>
      <section className="forms-grid">
        <RecurringSection
          recurringForm={recurringForm}
          setRecurringForm={setRecurringForm}
          onSubmit={onSubmitRecurring}
          currentYYYYMM={currentYYYYMM}
          editingRecurringId={editingRecurringId}
          onCancelEdit={onCancelRecurringEdit}
          dailyCategoryOptions={dailyCategoryOptions}
          t={t}
        />
      </section>

      <section className="lists-grid">
        <RecurringListSection
          filteredRecurring={filteredRecurring}
          recurringTitle={t.recurringListTitle}
          dailyCategoryOptions={dailyCategoryOptions}
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
          onEditRecurring={onEditRecurring}
          onUpdateRecurringInline={onUpdateRecurringInline}
          onDeleteRecurring={onDeleteRecurring}
          t={t}
        />
      </section>
    </>
  );
}
