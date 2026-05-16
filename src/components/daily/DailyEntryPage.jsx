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
  dailyRows,
  filteredRecurring,
  dailyTitle,
  dailyTitleSuggestions,
  onUpdateDailyInline,
  selectedCurrency,
  exchangeRates,
  locale,
  t
}) {
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

      <CategoryManagerSection
        categories={categories}
        locale={locale}
        onCreateCategory={onCreateCategory}
        onUpdateCategory={onUpdateCategory}
        onDeleteCategory={onDeleteCategory}
        onReorderCategories={onReorderCategories}
        t={t}
      />

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
          t={t}
        />
      </section>
    </>
  );
}
