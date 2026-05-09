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
  dailyTitle,
  dailyTitleSuggestions,
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
          dailyTitle={dailyTitle}
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
          onEditDaily={onEditDaily}
          onDeleteDaily={onDeleteDaily}
          t={t}
        />
      </section>
    </>
  );
}
