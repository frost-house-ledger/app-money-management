import React from "react";
import { formatMessage } from "../../i18n/translations.js";

export default function SettingsPage({
  locale,
  setLocale,
  selectedCurrency,
  setSelectedCurrency,
  exchangeRateStatus,
  syncDesktopUrl,
  setSyncDesktopUrl,
  syncAutoEnabled,
  setSyncAutoEnabled,
  syncStatus,
  syncBusy,
  syncServerInfo,
  onSyncNow,
  onImportCsv,
  onExportCsv,
  canExportCsv,
  t
}) {
  function renderErStatus() {
    const { state, updatedAt } = exchangeRateStatus || { state: "loading", updatedAt: null };
    if (state === "loading") {
      return <span className="er-status er-status--loading">{t.erStatusLoading}</span>;
    }
    if (state === "live") {
      const time = updatedAt
        ? new Date(updatedAt).toLocaleTimeString(locale === "de" ? "de-DE" : locale === "en" ? "en-US" : "ja-JP", { hour: "2-digit", minute: "2-digit" })
        : "";
      return <span className="er-status er-status--live">{formatMessage(t.erStatusLive, { time })}</span>;
    }
    return <span className="er-status er-status--fallback">{t.erStatusFallback}</span>;
  }

  function renderSyncStatus() {
    const status = syncStatus || { state: "idle", message: "", lastAt: null };
    if (status.state === "syncing") {
      return <span className="sync-status sync-status--syncing">{t.syncStatusSyncing}</span>;
    }
    if (status.state === "success") {
      return <span className="sync-status sync-status--success">{status.message || t.syncStatusSuccessManual}</span>;
    }
    if (status.state === "error") {
      return <span className="sync-status sync-status--error">{status.message || t.syncStatusFailed}</span>;
    }
    return <span className="sync-status sync-status--idle">{t.syncStatusIdle}</span>;
  }

  const syncServerUrls = Array.isArray(syncServerInfo?.urls) ? syncServerInfo.urls : [];

  return (
    <section className="forms-grid settings-page">
      <article className="card settings-card">
        <h2>{t.settingsTitle}</h2>
        <p className="subtext">{t.settingsSubtext}</p>

        <label>
          {t.settingsLanguageLabel}
          <select
            className="settings-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            <option value="ja">JP</option>
            <option value="en">EN</option>
            <option value="de">DE</option>
          </select>
        </label>

        <label>
          {t.settingsCurrencyLabel}
          <select
            className="settings-select"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
          >
            <option value="JPY">JPY(Japanese Yen)</option>
            <option value="EUR">EUR(Euro)</option>
            <option value="GBP">GBP(British Pound)</option>
            <option value="CHF">CHF(Swiss Franc)</option>
            <option value="AUD">AUD(Australian Dollar)</option>
            <option value="NZD">NZD(New Zealand Dollar)</option>
            <option value="TWD">TWD(Taiwan Dollar)</option>
            <option value="SGD">SGD(Singapore Dollar)</option>
            <option value="INR">INR(Indian Rupee)</option>
            <option value="CAD">CAD(Canadian Dollar)</option>
            <option value="USD">USD(United States Dollar)</option>
          </select>
          {renderErStatus()}
        </label>

        <label>
          {t.csvImportLabel}
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                await onImportCsv(file);
              }
            }}
          />
        </label>

        {canExportCsv ? (
          <div className="settings-button-row">
            <button type="button" onClick={() => onExportCsv("daily")}>
              {t.csvExportDailyButton}
            </button>
            <button type="button" onClick={() => onExportCsv("monthly")}>
              {t.csvExportMonthlyButton}
            </button>
          </div>
        ) : null}

        <p className="subtext">{t.csvImportSubtext}</p>

        <hr className="settings-divider" />

        <h3 className="settings-subtitle">{t.syncSectionTitle}</h3>
        <p className="subtext">{t.syncSectionSubtext}</p>

        {syncServerUrls.length > 0 ? (
          <p className="subtext sync-server-hint">
            {formatMessage(t.syncDesktopDetected, { url: syncServerUrls[0] })}
          </p>
        ) : null}

        <label>
          {t.syncDesktopUrlLabel}
          <input
            type="text"
            className="settings-input"
            placeholder={t.syncDesktopUrlPlaceholder}
            value={syncDesktopUrl}
            onChange={(e) => setSyncDesktopUrl(e.target.value)}
          />
        </label>

        <label className="sync-checkbox-row">
          <input
            type="checkbox"
            checked={syncAutoEnabled}
            onChange={(e) => setSyncAutoEnabled(e.target.checked)}
          />
          <span>{t.syncAutoEnabledLabel}</span>
        </label>

        <button type="button" onClick={onSyncNow} disabled={syncBusy}>
          {syncBusy ? t.syncNowRunningButton : t.syncNowButton}
        </button>

        {renderSyncStatus()}
      </article>
    </section>
  );
}
