import React from "react";
import { formatMessage } from "../../i18n/translations.js";

export default function SettingsPage({ locale, setLocale, selectedCurrency, setSelectedCurrency, exchangeRateStatus, t }) {
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
            <option value="JPY">JPY</option>
            <option value="NZD">NZD</option>
            <option value="EUR">EUR</option>
          </select>
          {renderErStatus()}
        </label>
      </article>
    </section>
  );
}
