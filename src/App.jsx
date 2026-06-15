import React, { useEffect, useMemo, useState } from "react";
import ChartDashboardPage from "./components/chart/ChartDashboardPage.jsx";
import MonthlyEntryPage from "./components/monthly/MonthlyEntryPage.jsx";
import DailyEntryPage from "./components/daily/DailyEntryPage.jsx";
import HistoryPage from "./components/history/HistoryPage.jsx";
import SettingsPage from "./components/settings/SettingsPage.jsx";
import CategoryAnalysisPage from "./components/analysis/CategoryAnalysisPage.jsx";
import AnnualSummaryPage from "./components/annual/AnnualSummaryPage.jsx";
import { api } from "./lib/api.js";
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
  
  const [selectedDailyCategory, setSelectedDailyCategory] = useState("all");
  const [selectedCurrency, setSelectedCurrency] = useState(() => localStorage.getItem("settings.currency") || "JPY");
  const [locale, setLocale] = useState(() => localStorage.getItem("settings.locale") || "ja");
  const [syncDesktopUrl, setSyncDesktopUrl] = useState(() => localStorage.getItem("settings.syncDesktopUrl") || "");
  const [syncAutoEnabled, setSyncAutoEnabled] = useState(() => localStorage.getItem("settings.syncAutoEnabled") === "1");
  const [exchangeRates, setExchangeRates] = useState(null);
  const [exchangeRateStatus, setExchangeRateStatus] = useState({ state: "loading", updatedAt: null });
  const [syncStatus, setSyncStatus] = useState({ state: "idle", message: "", lastAt: null });
  const [syncServerInfo, setSyncServerInfo] = useState(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [categories, setCategories] = useState([]);

  const [monthlySummary, setMonthlySummary] = useState(null);
  const [monthlyRows, setMonthlyRows] = useState([]);
  const [recurringRows, setRecurringRows] = useState([]);
  const [dailyRows, setDailyRows] = useState([]);
  const [currentMonthSnapshot, setCurrentMonthSnapshot] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);

  const [recurringForm, setRecurringForm] = useState({
    type: "fee",
    categoryId: "Food",
    title: "",
    amount: "",
    startMonth: baseMonth,
    endMonth: "",
    isSalary: false
  });

  const [dailyForm, setDailyForm] = useState({
    type: "fee",
    categoryId: "Food",
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
    const payload = buildEntryListPayload({ month, selectedDailyCategory, dateRange, locale });
    const daily = await api.entry.list(payload);
    setDailyRows(daily);
  }

  async function loadChartMonthSummary(month) {
    const summaryPayload = buildSummaryMonthPayload({ month, selectedDailyCategory, dateRange });
    const summary = await api.summary.month(summaryPayload);
    setMonthlySummary(summary);
  }

  async function loadRangeData(fromMonth, toMonth) {
    const payload = buildSummaryRangePayload({
      fromMonth,
      toMonth,
      selectedDailyCategory,
      dateRange
    });
    const rows = await api.summary.range(payload);
    setMonthlyRows(rows);
  }

  async function loadRecurring() {
    const rows = await api.recurring.list();
    setRecurringRows(rows);
  }

  async function loadCategories() {
    const rows = await api.category.list();
    setCategories(rows);
  }

  async function loadCurrentMonthSnapshot() {
    const snapshot = await api.summary.month({ month: currentYYYYMM });
    setCurrentMonthSnapshot(snapshot);
  }

  async function loadHistory() {
    const rows = await api.history.list({ limit: 200, locale });
    setHistoryRows(rows);
  }

  async function onImportCsv(file) {
    if (!file) {
      return;
    }

    setErrorText("");

    try {
      const csvText = await file.text();
      const result = await api.entry.importCsv({ csvText });
      await refreshAll(selectedMonth, range);
      showToast(formatMessage(t.toastCsvImported, { count: result.importedCount }));
    } catch (error) {
      setErrorText(error.message || t.errorCsvImportFailed);
    }
  }

  async function onExportCsv(scope) {
    if (typeof api.entry.exportCsv !== "function") {
      throw new Error(t.errorCsvExportUnavailable);
    }

    const result = await api.entry.exportCsv({ scope });
    const blob = new Blob([result.csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename || `backup-${scope}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast(formatMessage(t.toastCsvExported, { count: result.rowCount }));
  }

  async function refreshAll(month = selectedMonth, nextRange = range) {
    await Promise.all([
      loadRecurring(),
      loadCategories(),
      loadCurrentMonthSnapshot(),
      loadHistory(),
      loadMonthData(month),
      loadChartMonthSummary(month),
      loadRangeData(nextRange.fromMonth, nextRange.toMonth)
    ]);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    loadMonthData(selectedMonth);
  }, [selectedMonth, selectedDailyCategory, dateRange.fromDate, dateRange.toDate, locale]);

  useEffect(() => {
    loadChartMonthSummary(selectedMonth);
  }, [selectedMonth, selectedDailyCategory, dateRange.fromDate, dateRange.toDate]);

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
    localStorage.setItem("settings.syncDesktopUrl", syncDesktopUrl);
  }, [syncDesktopUrl]);

  useEffect(() => {
    localStorage.setItem("settings.syncAutoEnabled", syncAutoEnabled ? "1" : "0");
  }, [syncAutoEnabled]);

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

  useEffect(() => {
    let disposed = false;
    const currentDesktopUrl = syncDesktopUrl.trim();

    api.sync.serverInfo({ desktopUrl: currentDesktopUrl })
      .then((info) => {
        if (disposed) {
          return;
        }

        if (!info) {
          setSyncServerInfo(null);
          return;
        }

        setSyncServerInfo(info);
        if (!currentDesktopUrl && Array.isArray(info.urls) && info.urls.length > 0) {
          setSyncDesktopUrl(info.urls[0]);
        }
      })
      .catch(() => {
        if (!disposed) {
          setSyncServerInfo(null);
        }
      });

    return () => {
      disposed = true;
    };
  }, [syncDesktopUrl]);

  async function runSync(mode = "manual") {
    if (!syncDesktopUrl.trim()) {
      setSyncStatus({ state: "error", message: t.syncUrlRequired, lastAt: Date.now() });
      return;
    }
    if (syncBusy) {
      return;
    }

    setSyncBusy(true);
    setSyncStatus({ state: "syncing", message: t.syncStatusSyncing, lastAt: Date.now() });

    try {
      await api.sync.syncNow({ desktopUrl: syncDesktopUrl.trim() });
      await refreshAll(selectedMonth, range);
      const successMessage = mode === "manual" ? t.syncStatusSuccessManual : t.syncStatusSuccessAuto;
      setSyncStatus({ state: "success", message: successMessage, lastAt: Date.now() });
      if (mode === "manual") {
        showToast(t.syncToastSuccess);
      }
    } catch (error) {
      const message = error?.message || t.syncStatusFailed;
      setSyncStatus({ state: "error", message, lastAt: Date.now() });
      if (mode === "manual") {
        setErrorText(message);
      }
    } finally {
      setSyncBusy(false);
    }
  }

  useEffect(() => {
    if (!syncAutoEnabled || !syncDesktopUrl.trim()) {
      return;
    }

    const timer = window.setInterval(() => {
      runSync("auto");
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, [syncAutoEnabled, syncDesktopUrl, selectedMonth, range.fromMonth, range.toMonth]);

  const filteredRecurring = useMemo(() => {
    const categoryMap = new Map(
      categories.map((item) => [
        item.id,
        {
          icon: item.icon,
          label: locale === "de" ? item.nameDe : locale === "en" ? item.nameEn : item.nameJp
        }
      ])
    );
    return recurringRows.map((row) => {
      const categoryId = row.type === "fee" ? row.categoryId || "Food" : null;
      const category = categoryId ? categoryMap.get(categoryId) : null;
      return {
        ...row,
        categoryDisplay: category?.label || "-",
        categoryIcon: category?.icon || "🍽️"
      };
    });
  }, [recurringRows, categories, locale]);

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
      const created = await api.category.add(payload);
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
      await api.category.update(payload);
      await loadCategories();
    } catch (error) {
      setErrorText(error.message || t.errorCategoryRequired);
    }
  }

  async function onDeleteCategory(id) {
    setErrorText("");
    try {
      await api.category.delete({ id });
      await loadCategories();
      await loadMonthData(selectedMonth);
      await loadRangeData(range.fromMonth, range.toMonth);
      if (selectedDailyCategory === id) {
        setSelectedDailyCategory("all");
      }
      if (dailyForm.categoryId === id) {
        setDailyForm((current) => ({ ...current, categoryId: "Food" }));
      }
      setRecurringForm((current) => ({
        ...current,
        categoryId: current.categoryId === id ? "Food" : current.categoryId
      }));
    } catch (error) {
      setErrorText(error.message || t.errorCategoryRequired);
    }
  }

  async function onReorderCategories(ids) {
    setErrorText("");
    try {
      await api.category.reorder({ ids });
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
        categoryId: recurringForm.type === "fee" ? recurringForm.categoryId || "Food" : null,
        // Persist amounts in base currency; UI input is in selected display currency.
        amount: convertDisplayAmountToBase(recurringForm.amount, selectedCurrency, exchangeRates)
      };
      // Ensure isSalary flag is passed as boolean
      payload.isSalary = Boolean(recurringForm.isSalary);

      if (editingRecurringId) {
        await api.recurring.update({
          ...payload,
          id: editingRecurringId
        });
      } else {
        await api.recurring.add(payload);
      }

      setRecurringForm((current) => ({
        ...current,
        type: "fee",
        categoryId: "Food",
        title: "",
        amount: "",
        startMonth: baseMonth,
        endMonth: ""
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
      categoryId: item.categoryId || "Food",
      title: item.title,
      amount: formatBaseAmountForInput(item.amount, selectedCurrency, exchangeRates),
      startMonth: item.startMonth,
      endMonth: item.endMonth || ""
      ,
      isSalary: Boolean(item.isSalary)
    });
    setEditingRecurringId(item.id);
  }

  function onCancelRecurringEdit() {
    setRecurringForm({
      type: "fee",
      categoryId: "Food",
      title: "",
      amount: "",
      startMonth: baseMonth,
      endMonth: ""
    });
    setEditingRecurringId(null);
  }

  async function onUpdateRecurringInline(payload) {
    setErrorText("");
    try {
      await api.recurring.update({
        ...payload,
        amount: convertDisplayAmountToBase(payload.amount, selectedCurrency, exchangeRates)
      });
      setEditingRecurringId(null);
      await refreshAll();
      showToast(t.toastRecurringUpdated);
    } catch (error) {
      setErrorText(error.message || t.errorRecurringFailed);
      throw error;
    }
  }

  async function onDeleteRecurring(id) {
    setErrorText("");
    try {
      await api.recurring.delete({ id });
      if (editingRecurringId === id) {
        onCancelRecurringEdit();
      }
      await refreshAll();
      showToast(t.toastRecurringDeleted);
    } catch (error) {
      setErrorText(error.message || t.errorRecurringDeleteFailed);
      throw error;
    }
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
        await api.entry.update({
          ...dailyForm,
          id: editingDailyId,
          categoryId: dailyForm.type === "fee" ? dailyForm.categoryId || "Food" : null,
          amount: convertDisplayAmountToBase(dailyForm.amount, selectedCurrency, exchangeRates)
        });
        setEditingDailyId(null);
        setDailyForm((current) => ({
          ...current,
          title: "",
          amount: "",
          categoryId: current.type === "fee" ? current.categoryId || "Food" : "Food",
          note: ""
        }));
        await refreshAll(selectedMonth, range);
        showToast(t.toastDailyUpdated);
      } else {
        await api.entry.add({
          ...dailyForm,
          categoryId: dailyForm.type === "fee" ? dailyForm.categoryId || "Food" : null,
          amount: convertDisplayAmountToBase(dailyForm.amount, selectedCurrency, exchangeRates)
        });
        setDailyForm((current) => ({
          ...current,
          title: "",
          amount: "",
          categoryId: current.type === "fee" ? current.categoryId || "Food" : "Food",
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
      categoryId: row.categoryId || "Food",
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

  async function onUpdateDailyInline(payload) {
    setErrorText("");

    if ((payload.entryDate || "").slice(0, 7) > currentYYYYMM) {
      setErrorText(t.errorFutureDate);
      throw new Error(t.errorFutureDate);
    }

    try {
      await api.entry.update({
        ...payload,
        categoryId: payload.type === "fee" ? payload.categoryId || "Food" : null,
        amount: convertDisplayAmountToBase(payload.amount, selectedCurrency, exchangeRates)
      });
      setEditingDailyId(null);
      await refreshAll(selectedMonth, range);
      showToast(t.toastDailyUpdated);
    } catch (error) {
      setErrorText(error.message || t.errorDailyFailed);
      throw error;
    }
  }

  async function onDeleteDaily(id) {
    setErrorText("");
    try {
      await api.entry.delete({ id });
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

      {/* Month select for all tabs */}
      <section className="chart-month-toolbar">
        <label>
          <span>{t.chartMonthLabel}:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </label>
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
          selectedCurrency={selectedCurrency}
          range={range}
          setRange={setRange}
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
          dailyCategoryOptions={dailyCategoryOptions}
          filteredRecurring={filteredRecurring}
          selectedCurrency={selectedCurrency}
          onEditRecurring={onEditRecurring}
          onUpdateRecurringInline={onUpdateRecurringInline}
          onDeleteRecurring={onDeleteRecurring}
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
          filteredRecurring={filteredRecurring}
          dailyTitle={formatMessage(t.dailyListTitle, { month: selectedMonth })}
          dailyTitleSuggestions={dailyTitleSuggestions}
          onUpdateDailyInline={onUpdateDailyInline}
          selectedCurrency={selectedCurrency}
          locale={locale}
          exchangeRates={exchangeRates}
          selectedMonth={selectedMonth}
          t={t}
        />
      ) : activePage === "settings" ? (
        <SettingsPage
          locale={locale}
          setLocale={setLocale}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
          exchangeRateStatus={exchangeRateStatus}
          syncDesktopUrl={syncDesktopUrl}
          setSyncDesktopUrl={setSyncDesktopUrl}
          syncAutoEnabled={syncAutoEnabled}
          setSyncAutoEnabled={setSyncAutoEnabled}
          syncStatus={syncStatus}
          syncBusy={syncBusy}
          syncServerInfo={syncServerInfo}
          onSyncNow={() => runSync("manual")}
          onImportCsv={onImportCsv}
          onExportCsv={onExportCsv}
          canExportCsv={typeof api.entry.exportCsv === "function"}
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
