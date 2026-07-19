import React from "react";
import { logError } from "../../lib/logger.js";
import languagesData from "../../../json/languages.json";
import "../../styles/visibility-modal.css";

export default function LanguageVisibilityModal({ onClose, locale, t }) {
  const [languages, setLanguages] = React.useState([]);

  React.useEffect(() => {
    // Load languages from JSON with localStorage overrides
    const allLanguages = Array.isArray(languagesData?.items) ? languagesData.items : [];
    
    // Load user preferences from localStorage
    const userPrefs = (() => {
      try {
        const stored = localStorage.getItem("languageVisibility");
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        logError("LanguageVisibilityModal.loadPrefs", e);
        return {};
      }
    })();

    // Merge stored preferences with JSON data
    const merged = allLanguages.map((lang) => ({
      ...lang,
      hidden: userPrefs[lang.code] !== undefined ? userPrefs[lang.code].hidden : lang.hidden
    }));

    setLanguages(merged);
  }, []);

  async function savePreferences(prefs) {
    try {
      localStorage.setItem("languageVisibility", JSON.stringify(prefs));
      if (window.ipcApi?.invoke) {
        try {
          await window.ipcApi.invoke("languages:updateVisibility", {
            updates: Object.entries(prefs).map(([code, pref]) => ({
              code,
              hidden: pref.hidden
            }))
          });
        } catch (err) {
          logError("LanguageVisibilityModal.ipc.updateVisibility", err);
        }
      }
    } catch (err) {
      logError("LanguageVisibilityModal.savePreferences", err);
    }
  }

  function toggleLanguage(code) {
    setLanguages((prev) => {
      const updated = prev.map((lang) =>
        lang.code === code ? { ...lang, hidden: !lang.hidden } : lang
      );

      // Auto-save immediately
      const prefs = {};
      updated.forEach((lang) => {
        prefs[lang.code] = { hidden: lang.hidden };
      });
      savePreferences(prefs);

      return updated;
    });
  }

  // Compute grouped languages from current state
  const getGroupedLanguages = () => {
    const grouped = {};
    languages.forEach((lang) => {
      const region = lang.region || "Other";
      if (!grouped[region]) {
        grouped[region] = [];
      }
      grouped[region].push(lang);
    });
    
    // Sort regions: Asia, Global, Europe, Middle East, Europe/Asia, Other
    const regionOrder = ["Asia", "Global", "Europe", "Middle East", "Europe/Asia", "Other"];
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

  const groupedLanguages = getGroupedLanguages();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t.settingsLanguageVisibilityTitle}</h2>
        <p className="modal-description">
          {t.settingsLanguageVisibilityDescription}
        </p>

        <div className="language-visibility-list">
          {Object.entries(groupedLanguages).map(([region, langs]) => (
            <div key={region} className="language-region-group">
              <div className="region-header">{region}</div>
              <div className="region-languages">
                {langs.map((lang) => {
                  const isVisible = !lang.hidden;
                  
                  return (
                    <label
                      key={lang.code}
                      className="language-item"
                      data-region={lang.region}
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleLanguage(lang.code)}
                      />
                      <span className="language-flag">{lang.flag}</span>
                      <span className="language-name">{lang.name}</span>
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
