import React from "react";
import { logError } from "../../lib/logger.js";
import currenciesData from "../../../json/currency.json";
import "../../styles/visibility-modal.css";

export default function CurrencyVisibilityModal({ onClose, locale, t }) {
  const [currencies, setCurrencies] = React.useState([]);

  React.useEffect(() => {
    try {
      const allCurrencies = Array.isArray(currenciesData?.items) ? currenciesData.items : [];
      const userPrefs = (() => {
        try {
          const stored = localStorage.getItem("currencyVisibility");
          return stored ? JSON.parse(stored) : {};
        } catch (e) {
          return {};
        }
      })();

      const merged = allCurrencies.map((curr) => {
        const userHidden = userPrefs[curr.code]?.hidden;
        return {
          ...curr,
          hidden: userHidden !== undefined ? userHidden : curr.hidden
        };
      });

      setCurrencies(merged);
    } catch (err) {
      logError("CurrencyVisibilityModal.useEffect", err);
    }
  }, []);

  async function savePreferences(prefs) {
    try {
      localStorage.setItem("currencyVisibility", JSON.stringify(prefs));
      if (window.ipcApi?.invoke) {
        try {
          await window.ipcApi.invoke("currencies:updateVisibility", prefs);
        } catch (e) {
          // Server sync is optional
        }
      }
    } catch (err) {
      logError("CurrencyVisibilityModal.savePreferences", err);
    }
  }

  const toggleCurrency = (code) => {
    setCurrencies((prev) => {
      const updated = prev.map((curr) =>
        curr.code === code ? { ...curr, hidden: !curr.hidden } : curr
      );

      // Auto-save immediately
      const prefs = {};
      updated.forEach((curr) => {
        prefs[curr.code] = { hidden: curr.hidden };
      });
      savePreferences(prefs);

      return updated;
    });
  };

  // Compute grouped currencies from current state
  const getGroupedCurrencies = () => {
    const grouped = {};
    currencies.forEach((curr) => {
      const region = curr.region || "Other";
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(curr);
    });

    const regionOrder = ["Asia", "Oceania", "Europe", "North America", "South America", "Middle East", "Africa", "Other"];
    const sorted = {};
    regionOrder.forEach((region) => {
      if (grouped[region]) {
        sorted[region] = grouped[region];
      }
    });
    Object.keys(grouped).forEach((region) => {
      if (!sorted[region]) {
        sorted[region] = grouped[region];
      }
    });

    return sorted;
  };

  const groupedCurrencies = getGroupedCurrencies();
  const sortedRegions = Object.keys(groupedCurrencies);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t.settingsCurrencyVisibilityTitle}</h2>
        <p className="modal-description">{t.settingsCurrencyVisibilityDescription}</p>

        <div className="currency-visibility-list">
          {sortedRegions.map((region) => (
            <div key={region} className="currency-region-group">
              <div className="region-header">{region}</div>
              <div className="region-currencies">
                {groupedCurrencies[region].map((curr) => {
                  const isVisible = !curr.hidden;
                  
                  return (
                    <label
                      key={curr.code}
                      className="currency-item"
                      data-region={curr.region}
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleCurrency(curr.code)}
                      />
                      <span className="currency-code">{curr.code}</span>
                      <span className="currency-name">{curr.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
