import React from "react";
import { formatMessage } from "../../i18n/translations.js";
import { logError } from "../../lib/logger.js";

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
        ? new Date(updatedAt).toLocaleTimeString(locale === "de" ? "de-DE" : locale === "en" ? "en-UK" : "ja-JP", { hour: "2-digit", minute: "2-digit" })
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

  const CURRENCY_LIST = [
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'TWD', name: 'Taiwan Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'NZD', name: 'New Zealand Dollar' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'USD', name: 'United States Dollar' }
  ];

  const LanguageOptions = [
    { code: 'ja', name: '日本語 (Japanese)', flag: '🇯🇵' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪' },
    { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸' },
    { code: 'pt', name: 'Português (Portuguese)', flag: '🇵🇹' },
    { code: 'it', name: 'Italiano (Italian)', flag: '🇮🇹' },
    { code: 'fr', name: 'Français (French)', flag: '🇫🇷' },
    { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺' },
    { code: 'tw', name: '中文 (Chinese)', flag: '🇹🇼' },
    { code: 'ko', name: '한국어 (Korean)', flag: '🇰🇷' }
  ];

  const safeLanguageOptions = Array.isArray(LanguageOptions) ? LanguageOptions.filter((l) => l && l.code) : [];
  const safeCurrencyList = Array.isArray(CURRENCY_LIST) ? CURRENCY_LIST : [];
  try {
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
              onChange={(e) => {
                try {
                  setLocale(e.target.value);
                } catch (err) {
                  logError("SettingsPage.setLocale", err);
                }
              }}
            >
              {safeLanguageOptions.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.flag} {language.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t.settingsCurrencyLabel}
            <select
              className="settings-select"
              value={selectedCurrency}
              onChange={(e) => {
                try {
                  setSelectedCurrency(e.target.value);
                } catch (err) {
                  logError("SettingsPage.setSelectedCurrency", err);
                }
              }}
            >
              {safeCurrencyList.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code}({currency.name})
                </option>
              ))}
            </select>
          </label>

          <label>
            {t.csvImportLabel}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (event) => {
                try {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) {
                    await onImportCsv(file);
                  }
                } catch (err) {
                  logError("SettingsPage.onImportCsv", err);
                }
              }}
            />
          </label>

          {canExportCsv ? (
            <div className="settings-button-row">
              <button type="button" onClick={async () => { try { await onExportCsv("daily"); } catch (err) { logError("SettingsPage.onExportCsv.daily", err); } }}>
                {t.csvExportDailyButton}
              </button>
              <button type="button" onClick={async () => { try { await onExportCsv("monthly"); } catch (err) { logError("SettingsPage.onExportCsv.monthly", err); } }}>
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
              onChange={(e) => {
                try {
                  setSyncDesktopUrl(e.target.value);
                } catch (err) {
                  logError("SettingsPage.setSyncDesktopUrl", err);
                }
              }}
            />
          </label>

          <label className="sync-checkbox-row">
            <input
              type="checkbox"
              checked={syncAutoEnabled}
              onChange={(e) => {
                try {
                  setSyncAutoEnabled(e.target.checked);
                } catch (err) {
                  logError("SettingsPage.setSyncAutoEnabled", err);
                }
              }}
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
  } catch (err) {
    logError("SettingsPage.render", err);
    return (
      <section className="forms-grid settings-page">
        <article className="card settings-card">
          <h2>{t.settingsTitle}</h2>
          <p className="error">{t?.errorUnexpectedMessage || "An unexpected error occurred while displaying the settings page."}</p>
        </article>
      </section>
    );
  }
}
