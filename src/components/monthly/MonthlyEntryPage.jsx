import React from "react";
import RecurringSection, { RecurringListSection } from "./RecurringSection.jsx";

export default function MonthlyEntryPage({
  recurringForm,
  setRecurringForm,
  onSubmitRecurring,
  currentYYYYMM,
  editingRecurringId,
  onCancelRecurringEdit,
  filteredRecurring,
  selectedCurrency,
  exchangeRates,
  onEditRecurring,
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
          t={t}
        />
      </section>

      <section className="lists-grid">
        <RecurringListSection
          filteredRecurring={filteredRecurring}
          recurringTitle={t.recurringListTitle}
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
          onEditRecurring={onEditRecurring}
          t={t}
        />
      </section>
    </>
  );
}
