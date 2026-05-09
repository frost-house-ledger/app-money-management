import React, { useEffect, useMemo, useState } from "react";
import ChartDashboardPage from "./components/chart/ChartDashboardPage.jsx";
import MonthlyEntryPage from "./components/monthly/MonthlyEntryPage.jsx";
import DailyEntryPage from "./components/daily/DailyEntryPage.jsx";
import HistoryPage from "./components/history/HistoryPage.jsx";
import SettingsPage from "./components/settings/SettingsPage.jsx";
import CategoryAnalysisPage from "./components/analysis/CategoryAnalysisPage.jsx";
import AnnualSummaryPage from "./components/annual/AnnualSummaryPage.jsx";
import { addMonths, thisMonth, todayISO } from "./lib/date.js";
import {
  convertDisplayAmountToBase,
  formatBaseAmountForInput,
  formatCurrency,
  loadExchangeRates
} from "./lib/currency.js";
import {
  buildEntryListPayload,
  buildSummaryMonthPayload,
  buildSummaryRangePayload
} from "./lib/chartFilterPayloads.js";
import { formatMessage, getMessages } from "./i18n/translations.js";

function defaultRange(baseMonth) {
  return {
    fromMonth: addMonths(baseMonth, -5),
    toMonth: addMonths(baseMonth, 6)
  };
}

export default function App() {
  const baseMonth = thisMonth();
  const currentYYYYMM = todayISO().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(baseMonth);
  const [range, setRange] = useState(defaultRange(baseMonth));
  const [dateRange, setDateRange] = useState({ fromDate: "", toDate: "" });
  const [activePage, setActivePage] = useState("daily");
  const [filterType, setFilterType] = useState("all");
  const [selectedDailyCategory, setSelectedDailyCategory] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState(() => localStorage.getItem("settings.currency") || "JPY");
  const [locale, setLocale] = useState(() => localStorage.getItem("settings.locale") || "ja");
  const [exchangeRates, setExchangeRates] = useState(null);
  const [exchangeRateStatus, setExchangeRateStatus] = useState({ state: "loading", updatedAt: null });
  const [categories, setCategories] = useState([]);

  const [monthlySummary, setMonthlySummary] = useState(null);
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [recurringRows, setRecurringRows] = useState([]);
  const [dailyRows, setDailyRows] = useState([]);
  const [currentMonthSnapshot, setCurrentMonthSnapshot] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);

  const [recurringForm, setRecurringForm] = useState({
    type: "fee",
    title: "",
    amount: "",
    startMonth: baseMonth
  });

  const [dailyForm, setDailyForm] = useState({
    type: "fee",
    categoryId: "other",
    title: "",
    amount: "",
    entryDate: todayISO(),
    note: ""
  });

  const [errorText, setErrorText] = useState("");
  const [toastText, setToastText] = useState("");
  const [editingRecurringId, setEditingRecurringId] = useState(null);
  const [editingDailyId, setEditingDailyId] = useState(null);
  const t = useMemo(() => getMessages(locale), [locale]);

  function showToast(message) {
    setToastText(message);
    window.setTimeout(() => {
      setToastText("");
    }, 2200);
  }

  async function loadMonthData(month) {
    const payload = buildEntryListPayload({ month, filterType, selectedDailyCategory, dateRange, locale });
    const summaryPayload = buildSummaryMonthPayload({ month, selectedDailyCategory, dateRange });

    const [summary, daily] = await Promise.all([
      window.ledgerApi.summary.month(summaryPayload),
      window.ledgerApi.entry.list(payload)
    ]);
    setMonthlySummary(summary);
    setDailyRows(daily);
  }

  async function loadRangeData(fromMonth, toMonth) {
    const payload = buildSummaryRangePayload({
      fromMonth,
      toMonth,
      selectedDailyCategory,
      dateRange
    });
    const rows = await window.ledgerApi.summary.range(payload);
    setMonthlyRows(rows);
  }

  async function loadRecurring() {
    const rows = await window.ledgerApi.recurring.list();
    setRecurringRows(rows);
  }

  async function loadCategories() {
    const rows = await window.ledgerApi.category.list();
    setCategories(rows);
  }

  async function loadCurrentMonthSnapshot() {
    const snapshot = await window.ledgerApi.summary.month({ month: currentYYYYMM });
    setCurrentMonthSnapshot(snapshot);
  }

  async function loadHistory() {
    const rows = await window.ledgerApi.history.list({ limit: 200, locale });
    setHistoryRows(rows);
  }

  async function onImportCsv(file) {
    if (!file) {
      return;
    }

    setErrorText("");

    try {
      const csvText = await file.text();
      const result = await window.ledgerApi.entry.importCsv({ csvText });
      await refreshAll(selectedMonth, range);
      showToast(formatMessage(t.toastCsvImported, { count: result.importedCount }));
    } catch (error) {
      setErrorText(error.message || t.errorCsvImportFailed);
    }
  }

  async function refreshAll(month = selectedMonth, nextRange = range) {
    await Promise.all([
      loadRecurring(),
      loadCategories(),
      loadCurrentMonthSnapshot(),
      loadHistory(),
      loadMonthData(month),
      loadRangeData(nextRange.fromMonth, nextRange.toMonth)
    ]);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    loadMonthData(selectedMonth);
  }, [selectedMonth, filterType, selectedDailyCategory, dateRange.fromDate, dateRange.toDate, locale]);

  useEffect(() => {
    loadRangeData(range.fromMonth, range.toMonth);
  }, [range.fromMonth, range.toMonth, selectedDailyCategory, dateRange.fromDate, dateRange.toDate]);

  useEffect(() => {
    loadHistory();
  }, [locale]);

  useEffect(() => {
    localStorage.setItem("settings.locale", locale);
  }, [locale]);

  useEffect(() => {
    localStorage.setItem("settings.currency", selectedCurrency);
  }, [selectedCurrency]);

  useEffect(() => {
    loadExchangeRates().then((rates) => {
      if (rates) {
        setExchangeRates(rates);
        setExchangeRateStatus({ state: "live", updatedAt: Date.now() });
      } else {
        setExchangeRateStatus({ state: "fallback", updatedAt: null });
      }
    });
  }, []);

  const filteredRecurring = useMemo(() => {
    if (filterType === "all") {
      return recurringRows;
    }
    return recurringRows.filter((row) => row.type === filterType);
  }, [recurringRows, filterType]);

  const dailyTitleSuggestions = useMemo(() => {
    const seen = new Set();

    return historyRows
      .filter((row) => row.source === "daily" && row.title)
      .map((row) => String(row.title).trim())
      .filter((title) => title && !seen.has(title) && seen.add(title))
      .slice(0, 12);
  }, [historyRows]);

  const dailyCategoryOptions = useMemo(() => {
    return categories
      .filter((item) => Number(item.isActive) === 1)
      .map((item) => ({
        id: item.id,
        icon: item.icon,
        label: locale === "de" ? item.nameDe : locale === "en" ? item.nameEn : item.nameJp
      }));
  }, [categories, locale]);

  const localeTag = locale === "de" ? "de-DE" : locale === "en" ? "en-US" : "ja-JP";
  const todayLabel = new Date().toLocaleDateString(localeTag, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  async function onCreateCategory(payload) {
    setErrorText("");
    try {
      const created = await window.ledgerApi.category.add(payload);
      await loadCategories();
      setDailyForm((current) => ({ ...current, categoryId: created.id }));
      showToast(t.toastCategoryAdded);
    } catch (error) {
      setErrorText(error.message || t.errorCategoryRequired);
    }
  }

  async function onUpdateCategory(payload) {
    setErrorText("");
    try {
      await window.ledgerApi.category.update(payload);
      await loadCategories();
    } catch (error) {
      setErrorText(error.message || t.errorCategoryRequired);
    }
  }

  async function onDeleteCategory(id) {
    setErrorText("");
    try {
      await window.ledgerApi.category.delete({ id });
      await loadCategories();
      await loadMonthData(selectedMonth);
      await loadRangeData(range.fromMonth, range.toMonth);
      if (selectedDailyCategory === id) {
        setSelectedDailyCategory("all");
      }
      if (dailyForm.categoryId === id) {
        setDailyForm((current) => ({ ...current, categoryId: "other" }));
      }
    } catch (error) {
      setErrorText(error.message || t.errorCategoryRequired);
    }
  }

  async function onReorderCategories(ids) {
    setErrorText("");
    try {
      await window.ledgerApi.category.reorder({ ids });
      await loadCategories();
    } catch (error) {
      setErrorText(error.message || t.errorCategoryRequired);
    }
  }

  async function onSubmitRecurring(event) {
    event.preventDefault();
    setErrorText("");

    try {
      const payload = {
        ...recurringForm,
        // Persist amounts in base currency; UI input is in selected display currency.
        amount: convertDisplayAmountToBase(recurringForm.amount, selectedCurrency, exchangeRates)
      };

      if (editingRecurringId) {
        await window.ledgerApi.recurring.update({
          ...payload,
          id: editingRecurringId
        });
      } else {
        await window.ledgerApi.recurring.add(payload);
      }

      setRecurringForm((current) => ({
        ...current,
        type: "fee",
        title: "",
        amount: "",
        startMonth: baseMonth
      }));
      setEditingRecurringId(null);

      await refreshAll();
      showToast(editingRecurringId ? t.toastRecurringUpdated : t.toastRecurringSaved);
    } catch (error) {
      setErrorText(error.message || t.errorRecurringFailed);
    }
  }

  function onEditRecurring(item) {
    setRecurringForm({
      type: item.type,
      title: item.title,
      amount: formatBaseAmountForInput(item.amount, selectedCurrency, exchangeRates),
      startMonth: item.startMonth
    });
    setEditingRecurringId(item.id);
  }

  function onCancelRecurringEdit() {
    setRecurringForm({
      type: "fee",
      title: "",
      amount: "",
      startMonth: baseMonth
    });
    setEditingRecurringId(null);
  }

  async function onSubmitDaily(event) {
    event.preventDefault();
    setErrorText("");

    if (dailyForm.entryDate.slice(0, 7) > currentYYYYMM) {
      setErrorText(t.errorFutureDate);
      return;
    }

    try {
      if (editingDailyId) {
        await window.ledgerApi.entry.update({
          ...dailyForm,
          id: editingDailyId,
          categoryId: dailyForm.type === "fee" ? dailyForm.categoryId || "other" : null,
          amount: convertDisplayAmountToBase(dailyForm.amount, selectedCurrency, exchangeRates)
        });
        setEditingDailyId(null);
        setDailyForm((current) => ({
          ...current,
          title: "",
          amount: "",
          categoryId: current.type === "fee" ? current.categoryId || "other" : "other",
          note: ""
        }));
        await refreshAll(selectedMonth, range);
        showToast(t.toastDailyUpdated);
      } else {
        await window.ledgerApi.entry.add({
          ...dailyForm,
          categoryId: dailyForm.type === "fee" ? dailyForm.categoryId || "other" : null,
          amount: convertDisplayAmountToBase(dailyForm.amount, selectedCurrency, exchangeRates)
        });
        setDailyForm((current) => ({
          ...current,
          title: "",
          amount: "",
          categoryId: current.type === "fee" ? current.categoryId || "other" : "other",
          note: ""
        }));
        await refreshAll(selectedMonth, range);
        showToast(t.toastDailySaved);
      }
    } catch (error) {
      setErrorText(error.message || t.errorDailyFailed);
    }
  }

  function onEditDaily(row) {
    setEditingDailyId(row.id);
    setDailyForm({
      type: row.type,
      categoryId: row.categoryId || "other",
      title: row.title,
      amount: formatBaseAmountForInput(row.amount, selectedCurrency, exchangeRates),
      entryDate: row.entryDate,
      note: row.note || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onCancelDailyEdit() {
    setEditingDailyId(null);
    setDailyForm((current) => ({
      ...current,
      title: "",
      amount: "",
      note: ""
    }));
  }

  async function onDeleteDaily(id) {
    setErrorText("");
    try {
      await window.ledgerApi.entry.delete({ id });
      await refreshAll(selectedMonth, range);
      showToast(t.toastDailyDeleted);
    } catch (error) {
      setErrorText(error.message || t.errorDailyDeleteFailed);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-head">
          <h1>{t.appTitle}</h1>
        </div>
        <p>{t.appDescription}</p>
      </section>

      <div className={`toast ${toastText ? "show" : ""}`}>{toastText}</div>

      {/* Today's date and current month income/expense snapshot */}
      <section className="card main-snapshot">
        <div className="snapshot-item">
          <span>{t.todayLabel}</span>
          <strong>{todayLabel}</strong>
        </div>
        <div className="snapshot-item">
          <span>{t.thisMonthExpenseLabel}</span>
          <strong>{formatCurrency(currentMonthSnapshot?.fee || 0, selectedCurrency, exchangeRates)}</strong>
        </div>
        <div className="snapshot-item">
          <span>{t.thisMonthIncomeLabel}</span>
          <strong>{formatCurrency(currentMonthSnapshot?.income || 0, selectedCurrency, exchangeRates)}</strong>
        </div>
      </section>

      {/* Page view tabs */}
      {/* Monthly, Daily, and Chart tabs */}
      <nav className="page-tabs-nav" role="tablist" aria-label="Page view tabs">
        <button
          type="button"
          className={`tab-button ${activePage === "daily" ? "active" : ""}`}
          onClick={() => setActivePage("daily")}
        >
          {t.dailyPageTab}
        </button>

        <button
          type="button"
          className={`tab-button ${activePage === "monthly" ? "active" : ""}`}
          onClick={() => setActivePage("monthly")}
        >
          {t.monthlyPageTab}
        </button>

        <button
          type="button"
          className={`tab-button ${activePage === "chart" ? "active" : ""}`}
          onClick={() => setActivePage("chart")}
        >
          {t.chartPageTab}
        </button>

        <button
          type="button"
          className={`tab-button ${activePage === "analysis" ? "active" : ""}`}
          onClick={() => setActivePage("analysis")}
        >
          {t.analysisPageTab}
        </button>
        <button
          type="button"
          className={`tab-button ${activePage === "annual" ? "active" : ""}`}
          onClick={() => setActivePage("annual")}
        >
          {t.annualPageTab}
        </button>

        <button
          type="button"
          className={`tab-button ${activePage === "history" ? "active" : ""}`}
          onClick={() => setActivePage("history")}
        >
          {t.historyPageTab}
        </button>
        <button
          type="button"
          className={`tab-button ${activePage === "settings" ? "active" : ""}`}
          onClick={() => setActivePage("settings")}
        >
          {t.settingsPageTab}
        </button>

      </nav>

      {errorText && <p className="error">{errorText}</p>}

      {activePage === "chart" ? (
        <ChartDashboardPage
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          filterType={filterType}
          setFilterType={setFilterType}
          selectedCurrency={selectedCurrency}
          range={range}
          setRange={setRange}
          dateRange={dateRange}
          setDateRange={setDateRange}
          selectedDailyCategory={selectedDailyCategory}
          setSelectedDailyCategory={setSelectedDailyCategory}
          dailyCategoryOptions={dailyCategoryOptions}
          monthlySummary={monthlySummary}
          monthlyRows={monthlyRows}
          exchangeRates={exchangeRates}
          t={t}
        />
      ) : activePage === "monthly" ? (
        <MonthlyEntryPage
          recurringForm={recurringForm}
          setRecurringForm={setRecurringForm}
          onSubmitRecurring={onSubmitRecurring}
          currentYYYYMM={currentYYYYMM}
          editingRecurringId={editingRecurringId}
          onCancelRecurringEdit={onCancelRecurringEdit}
          filteredRecurring={filteredRecurring}
          selectedCurrency={selectedCurrency}
          onEditRecurring={onEditRecurring}
          exchangeRates={exchangeRates}
          t={t}
        />
      ) : activePage === "daily" ? (
        <DailyEntryPage
          dailyForm={dailyForm}
          setDailyForm={setDailyForm}
          onSubmitDaily={onSubmitDaily}
          editingDailyId={editingDailyId}
          onEditDaily={onEditDaily}
          onCancelDailyEdit={onCancelDailyEdit}
          onDeleteDaily={onDeleteDaily}
          dailyCategoryOptions={dailyCategoryOptions}
          categories={categories.filter((item) => Number(item.isActive) === 1)}
          onCreateCategory={onCreateCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
          onReorderCategories={onReorderCategories}
          dailyRows={dailyRows}
          dailyTitle={formatMessage(t.dailyListTitle, { month: selectedMonth })}
          dailyTitleSuggestions={dailyTitleSuggestions}
          selectedCurrency={selectedCurrency}
          locale={locale}
          exchangeRates={exchangeRates}
          t={t}
        />
      ) : activePage === "settings" ? (
        <SettingsPage
          locale={locale}
          setLocale={setLocale}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
          exchangeRateStatus={exchangeRateStatus}
          onImportCsv={onImportCsv}
          t={t}
        />
      ) : activePage === "analysis" ? (
        <CategoryAnalysisPage
          selectedMonth={selectedMonth}
          range={range}
          selectedCurrency={selectedCurrency}
          locale={locale}
          exchangeRates={exchangeRates}
          t={t}
        />
      ) : activePage === "annual" ? (
        <AnnualSummaryPage
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
          t={t}
        />
      ) : (
        <HistoryPage
          historyRows={historyRows}
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
          t={t}
        />
      )}
    </main>
  );
}
