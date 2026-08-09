import React from "react";
import DailySection, { DailyListSection } from "./DailySection.jsx";
import CategoryManagerSection from "../category/CategoryManagerSection.jsx";

export default function DailyEntryPage({
  dailyForm,
  setDailyForm,
  onSubmitDaily,
  editingDailyId,
  onEditDaily,
  onCancelDailyEdit,
  onDeleteDaily,
  dailyCategoryOptions,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  onResetCategories,
  dailyRows,
  filteredRecurring,
  dailyTitle,
  dailyTitleSuggestions,
  onUpdateDailyInline,
  selectedCurrency,
  exchangeRates,
  locale,
  selectedMonth,
  t
}) {
  const [categoryManagerOpen, setCategoryManagerOpen] = React.useState(false);

  React.useEffect(() => {
    if (!categoryManagerOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") setCategoryManagerOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [categoryManagerOpen]);

  return (
    <>
      <section className="forms-grid">
        <DailySection
          dailyForm={dailyForm}
          setDailyForm={setDailyForm}
          onSubmit={onSubmitDaily}
          editingDailyId={editingDailyId}
          onCancelDailyEdit={onCancelDailyEdit}
          dailyCategoryOptions={dailyCategoryOptions}
          dailyTitleSuggestions={dailyTitleSuggestions}
          t={t}
        />
      </section>

      <section className="category-manager-launcher" aria-label={t.categoryManagerTitle}>
        <button type="button" align="left" onClick={() => setCategoryManagerOpen(true)}>
          {t.categoryManagerTitle}
        </button>
      </section>

      {categoryManagerOpen && (
        <div
          className="category-manager-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCategoryManagerOpen(false);
          }}
        >
          <div className="category-manager-modal" role="dialog" aria-modal="true" aria-labelledby="category-manager-title">
            <CategoryManagerSection
              categories={categories}
              locale={locale}
              onCreateCategory={onCreateCategory}
              onUpdateCategory={onUpdateCategory}
              onDeleteCategory={onDeleteCategory}
              onReorderCategories={onReorderCategories}
              onResetCategories={onResetCategories}
              onClose={() => setCategoryManagerOpen(false)}
              titleId="category-manager-title"
              t={t}
            />
          </div>
        </div>
      )}

      <section className="lists-grid">
        <DailyListSection
          dailyRows={dailyRows}
          filteredRecurring={filteredRecurring}
          dailyTitle={dailyTitle}
          dailyCategoryOptions={dailyCategoryOptions}
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
          onEditDaily={onEditDaily}
          onUpdateDailyInline={onUpdateDailyInline}
          onDeleteDaily={onDeleteDaily}
          selectedMonth={selectedMonth}
          t={t}
        />
      </section>
    </>
  );
}
