import React from "react";
import { logError } from "../../lib/logger.js";
import languagesData from "../../../json/languages.json";

export default function LanguageVisibilityModal({ onClose, locale, t }) {
  const [languages, setLanguages] = React.useState([]);
  const [groupedLanguages, setGroupedLanguages] = React.useState({});
  const [saving, setSaving] = React.useState(false);

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

    // Group by region
    const grouped = {};
    merged.forEach((lang) => {
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

    setGroupedLanguages(sorted);
  }, []);

  function toggleLanguage(code) {
    setLanguages((prev) =>
      prev.map((lang) =>
        lang.code === code ? { ...lang, hidden: !lang.hidden } : lang
      )
    );
  }

  async function handleSave() {
    try {
      setSaving(true);

      // Save to localStorage
      const prefs = {};
      languages.forEach((lang) => {
        prefs[lang.code] = { hidden: lang.hidden };
      });
      localStorage.setItem("languageVisibility", JSON.stringify(prefs));

      // Call IPC to save to server (optional - if you want to persist server-side)
      if (window.ipcApi?.invoke) {
        try {
          await window.ipcApi.invoke("languages:updateVisibility", {
            updates: languages.map((lang) => ({
              code: lang.code,
              hidden: lang.hidden
            }))
          });
        } catch (err) {
          logError("LanguageVisibilityModal.ipc.updateVisibility", err);
          // Continue even if IPC fails - localStorage is already saved
        }
      }

      onClose();
    } catch (err) {
      logError("LanguageVisibilityModal.handleSave", err);
    } finally {
      setSaving(false);
    }
  }

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

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={saving}>
            {t.cancelButton}
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="primary">
            {saving ? t.savingButton : t.saveButton}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 24px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .modal-content h2 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }

        .modal-description {
          margin: 0 0 16px 0;
          font-size: 14px;
          color: #666;
        }

        .language-visibility-list {
          margin: 24px 0;
        }

        .language-region-group {
          margin-bottom: 32px;
        }

        .language-region-group:last-child {
          margin-bottom: 0;
        }

        .region-header {
          font-weight: 700;
          font-size: 13px;
          color: #444;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 2px solid #007bff;
        }

        .region-languages {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 8px;
        }

        @media (max-width: 500px) {
          .region-languages {
            grid-template-columns: 1fr;
          }
        }

        .language-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          cursor: pointer;
          user-select: none;
          border-radius: 6px;
          transition: all 0.2s;
          border: 1px solid transparent;
          position: relative;
        }

        .language-item:hover {
          background: #f0f4ff;
          border-color: #007bff;
        }

        .language-item input[type="checkbox"] {
          cursor: pointer;
          width: 18px;
          height: 18px;
          accent-color: #007bff;
          flex-shrink: 0;
        }

        .language-flag {
          font-size: 20px;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }

        .language-name {
          font-size: 14px;
          font-weight: 500;
          flex: 1;
          min-width: 0;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 28px;
          padding-top: 16px;
          border-top: 1px solid #e9ecef;
        }

        .modal-actions button {
          padding: 10px 20px;
          border: 1px solid #ccc;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          background: white;
          transition: all 0.2s;
        }

        .modal-actions button:hover:not(:disabled) {
          background: #f5f5f5;
          border-color: #999;
        }

        .modal-actions button.primary {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .modal-actions button.primary:hover:not(:disabled) {
          background: #0056b3;
          border-color: #0056b3;
        }

        .modal-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
