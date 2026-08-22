import React from "react";
import { EMPTY_ENTRY_FILTER } from "../../lib/entryFilters.js";

export default function EntryFilterBar({ filter, setFilter, categories = [], t }) {
  const [draftFilter, setDraftFilter] = React.useState(filter);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  React.useEffect(() => {
    setDraftFilter(filter);
  }, [filter]);

  const update = (key, value) => setDraftFilter((current) => ({ ...current, [key]: value }));
  const apply = (event) => {
    event.preventDefault();
    setFilter(draftFilter);
  };
  const reset = () => {
    setDraftFilter(EMPTY_ENTRY_FILTER);
    setFilter(EMPTY_ENTRY_FILTER);
  };

  return (
    <section className="card entry-filter-bar" aria-label={t.entryFilterTitle || "Search and filters"}>
      <div className="entry-filter-header">
        <h2>{t.entryFilterTitle || "Search and filters"}</h2>
        <div className="entry-filter-actions">
          {!isCollapsed && (
            <button type="submit" form="entry-filter-form" className="primary-button">
              {t.searchButtonLabel || "Search"}
            </button>
          )}
          <button
            type="button"
            className="secondary-button entry-filter-collapse"
            onClick={() => setIsCollapsed((current) => !current)}
            aria-expanded={!isCollapsed}
            aria-controls="entry-filter-form"
          >
            {isCollapsed ? (t.expandFiltersLabel || "Expand") : (t.collapseFiltersLabel || "Collapse")}
          </button>
        </div>
      </div>
      {!isCollapsed && <form id="entry-filter-form" className="entry-filter-grid" onSubmit={apply}>
        <label>
          {t.entrySearchLabel || "Search"}
          <input
            type="search"
            value={draftFilter.query}
            onChange={(event) => update("query", event.target.value)}
            placeholder={t.entrySearchPlaceholder || "Title or note"}
          />
        </label>
        <label>
          {t.categoryLabel}
          <select value={draftFilter.categoryId} onChange={(event) => update("categoryId", event.target.value)}>
            <option value="all">{t.allLabel || "All"}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.icon || ""} {category.label}</option>
            ))}
          </select>
        </label>
        <label>
          {t.minimumAmountLabel || "Min amount"}
          <input type="number" min="0" value={draftFilter.minAmount} onChange={(event) => update("minAmount", event.target.value)} />
        </label>
        <label>
          {t.maximumAmountLabel || "Max amount"}
          <input type="number" min="0" value={draftFilter.maxAmount} onChange={(event) => update("maxAmount", event.target.value)} />
        </label>
        <label>
          {t.fromDateLabel || "From"}
          <input type="date" value={draftFilter.fromDate} onChange={(event) => update("fromDate", event.target.value)} />
        </label>
        <label>
          {t.toDateLabel || "To"}
          <input type="date" value={draftFilter.toDate} onChange={(event) => update("toDate", event.target.value)} />
        </label>
        <button type="button" className="secondary-button entry-filter-reset" onClick={reset}>
          {t.clearFiltersLabel || "Clear filters"}
        </button>
      </form>}
    </section>
  );
}
