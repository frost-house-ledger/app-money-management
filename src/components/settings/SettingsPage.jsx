import React from "react";
import { formatMessage } from "../../i18n/translations.js";
import { logError } from "../../lib/logger.js";
import languagesData from "../../../json/languages.json";
import currenciesData from "../../../json/currency.json";
import LanguageVisibilityModal from "./LanguageVisibilityModal.jsx";
import CurrencyVisibilityModal from "./CurrencyVisibilityModal.jsx";

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
  const [showLanguageVisibilityModal, setShowLanguageVisibilityModal] = React.useState(false);
  const [languageRefreshKey, setLanguageRefreshKey] = React.useState(0);
  const [showCurrencyVisibilityModal, setShowCurrencyVisibilityModal] = React.useState(false);
  const [currencyRefreshKey, setCurrencyRefreshKey] = React.useState(0);

  const handleCloseLanguageModal = () => {
    setShowLanguageVisibilityModal(false);
    // Trigger UI refresh to show updated language list
    setLanguageRefreshKey((prev) => prev + 1);
  };

  const handleCloseCurrencyModal = () => {
    setShowCurrencyVisibilityModal(false);
    // Trigger UI refresh to show updated currency list
    setCurrencyRefreshKey((prev) => prev + 1);
  };

  // Load language visibility preferences
  const getVisibleLanguages = () => {
    const allLanguages = Array.isArray(languagesData?.items) ? languagesData.items : [];
    const userPrefs = (() => {
      try {
        const stored = localStorage.getItem("languageVisibility");
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    })();

    return allLanguages.filter((lang) => {
      const userHidden = userPrefs[lang.code]?.hidden;
      if (userHidden !== undefined) {
        return !userHidden;
      }
      return !lang.hidden;
    });
  };

  // Load currency visibility preferences
  const getVisibleCurrencies = () => {
    const allCurrencies = Array.isArray(currenciesData?.items) ? currenciesData.items : [];
    const userPrefs = (() => {
      try {
        const stored = localStorage.getItem("currencyVisibility");
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    })();

    return allCurrencies.filter((curr) => {
      const userHidden = userPrefs[curr.code]?.hidden;
      if (userHidden !== undefined) {
        return !userHidden;
      }
      return !curr.hidden;
    });
  };
  
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

  const safeLanguageOptions = getVisibleLanguages();
  const safeCurrencyList = getVisibleCurrencies();
  try {
    return (
      <section className="forms-grid settings-page">
        <article className="card settings-card">
          <h2>{t.settingsTitle}</h2>
          <p className="subtext">{t.settingsSubtext}</p>

          <label>
            {t.settingsLanguageLabel}
            <select
              key={`language-select-${languageRefreshKey}`}
              className="settings-select language-select"
              value={locale}
              onChange={(e) => {
                try {
                  setLocale(e.target.value);
                } catch (err) {
                  logError("SettingsPage.setLocale", err);
                }
              }}
            >
              {Object.entries(
                safeLanguageOptions.reduce((acc, lang) => {
                  const region = lang.region || "Other";
                  if (!acc[region]) acc[region] = [];
                  acc[region].push(lang);
                  return acc;
                }, {})
              )
                .sort(([a], [b]) => {
                  const order = ["Asia", "Global", "Europe", "Middle East", "Europe/Asia", "Other"];
                  return order.indexOf(a) - order.indexOf(b);
                })
                .map(([region, langs]) => (
                  <optgroup key={region} label={region} data-region={region}>
                    {langs.map((language) => (
                      <option
                        key={language.code}
                        value={language.code}
                        data-region={region}
                      >
                        {language.flag} {language.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setShowLanguageVisibilityModal(true)}
            className="settings-button"
          >
            {t.settingsLanguageManageButton}
          </button>

          <label>
            {t.settingsCurrencyLabel}
            <select
              key={`currency-select-${currencyRefreshKey}`}
              className="settings-select currency-select"
              value={selectedCurrency}
              onChange={(e) => {
                try {
                  setSelectedCurrency(e.target.value);
                } catch (err) {
                  logError("SettingsPage.setSelectedCurrency", err);
                }
              }}
            >
              {Object.entries(
                safeCurrencyList.reduce((acc, curr) => {
                  const region = curr.region || "Other";
                  if (!acc[region]) acc[region] = [];
                  acc[region].push(curr);
                  return acc;
                }, {})
              )
                .sort(([a], [b]) => {
                  const order = ["Asia", "Oceania", "Europe", "North America", "South America", "Middle East", "Africa", "Other"];
                  return order.indexOf(a) - order.indexOf(b);
                })
                .map(([region, currs]) => (
                  <optgroup key={region} label={region} data-region={region}>
                    {currs.map((currency) => (
                      <option
                        key={currency.code}
                        value={currency.code}
                        data-region={region}
                      >
                        {currency.code} ({currency.name})
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setShowCurrencyVisibilityModal(true)}
            className="settings-button"
          >
            {t.settingsCurrencyManageButton}
          </button>

          <br />

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

        {showLanguageVisibilityModal && (
          <LanguageVisibilityModal
            onClose={handleCloseLanguageModal}
            locale={locale}
            t={t}
          />
        )}

        {showCurrencyVisibilityModal && (
          <CurrencyVisibilityModal
            onClose={handleCloseCurrencyModal}
            locale={locale}
            t={t}
          />
        )}
        
        <br />

        If you find this app useful, please consider supporting its development. 
        <p>Your support helps maintain and improve the app.</p>
          <p>Support: <a
            href="https://github.com/sponsors/KFrost-Sponsor"
            onClick={(e) => { e.preventDefault(); openExternalUrl('https://github.com/sponsors/KFrost-Sponsor'); }}
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
          >GitHub Sponsors</a></p>
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

function openExternalUrl(url) {
  try {
    // If running inside Electron, use IPC to open in system default browser
    if (typeof window !== 'undefined' && window.shellApi?.openExternal) {
      window.shellApi.openExternal(url);
      return;
    }
  } catch (e) {
    // ignore
  }
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (e) {
    // last resort: set location
    window.location.href = url;
  }
}
