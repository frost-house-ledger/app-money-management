import React from "react";
import { logError } from "../../lib/logger.js";
import languagesData from "../../../json/languages.json";

/**
 * Build LANGUAGE_INFO from languages.json
 * Includes: code, region, all name fields (nameJa, nameEn, nameRu, nameDe, etc.)
 */
const LANGUAGE_INFO = {};
const LANGUAGE_BY_REGION = {};

if (Array.isArray(languagesData?.items)) {
  languagesData.items.forEach(item => {
    // Extract all fields from the language item
    const info = {
      code: item.code,
      region: item.region || "Other",
      nameJa: item.nameJa,
      nameEn: item.nameEn,
      flag: item.flag,
      hidden: item.hidden ?? false
    };
    
    // Include all name* fields dynamically
    Object.keys(item).forEach(key => {
      if (key.startsWith("name")) {
        info[key] = item[key];
      }
    });
    
    LANGUAGE_INFO[item.code] = info;
    
    // Index by region for region-based lookups
    if (!LANGUAGE_BY_REGION[info.region]) {
      LANGUAGE_BY_REGION[info.region] = [];
    }
    LANGUAGE_BY_REGION[info.region].push(info);
  });
}

/**
 * Generate the name field key for a given language code
 * e.g., "ru" -> "nameRu", "jp" -> "nameJp", "en" -> "nameEn"
 * Validates the field exists in the language item before recommending it
 * @param {string} langCode - Language code (e.g., "jp", "en", "ru")
 * @returns {string} Field name (e.g., "nameJp"), defaults to "nameEn"
 */
function getNameFieldForLanguage(langCode) {
  if (!langCode) return "nameEn";
  
  const code = String(langCode).toLowerCase().trim();
  if (!code) return "nameEn";
  
  // Special cases for jp and en
  if (code === "jp") return "nameJp";
  if (code === "en") return "nameEn";
  
  // For other languages: capitalize first letter (ru -> nameRu, de -> nameDe, etc.)
  const fieldName = "name" + code.charAt(0).toUpperCase() + code.slice(1);
  
  return fieldName;
}

/**
 * Get language info by code, with optional region filtering
 * @param {string} code - Language code
 * @returns {object|null} Language info or null if not found
 */
function getLanguageInfo(code) {
  return LANGUAGE_INFO[String(code || "").toLowerCase()] || null;
}

/**
 * Get all languages in a specific region
 * @param {string} region - Region name (e.g., "Asia", "Europe")
 * @returns {array} Array of language info objects
 */
function getLanguagesByRegion(region) {
  return LANGUAGE_BY_REGION[region] || [];
}

function getLanguageCode(locale) {
  const raw = String(locale || "").toLowerCase();
  const info = getLanguageInfo(raw);
  return info ? info.code : "en";
}

function getLanguageDisplayName(langCode, displayLocale = "jp") {
  const info = getLanguageInfo(langCode);
  if (!info) return langCode;
  const isJp = String(displayLocale || "").toLowerCase().startsWith("jp");
  return isJp ? info.nameJa : info.nameEn;
}

/**
 * Get display name for a category in the specified locale
 * Tries language-specific name field, then falls back to Ja/En
 * @param {object} category - Category object
 * @param {string} locale - Locale code
 * @returns {string} Display name
 */
function displayName(category, locale) {
  if (!category) return "";
  
  // Get name in the appropriate language field
  const langCode = getLanguageCode(locale);
  const nameField = getNameFieldForLanguage(langCode);
  
  // Try to get name from language-specific field
  if (category[nameField]) {
    return category[nameField];
  }
  
  // Fallback: try other common fields in priority order
  return category.nameJp || category.nameJa || category.nameEn || category.name || category.id || "";
}

export default function CategoryManagerSection({
  categories,
  locale,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  onResetCategories,
  t
}) {
  const safeLocale = locale || "jp";
  const primaryLangCode = getLanguageCode(safeLocale);
  
  // Dynamic state for new category based on current locale - ONLY primary language
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [newCategoryIcon, setNewCategoryIcon] = React.useState("");
  
  // Dynamic state for editing - ONLY primary language
  const [editingId, setEditingId] = React.useState("");
  const [editingName, setEditingName] = React.useState("");
  const [editingIcon, setEditingIcon] = React.useState("");
  const [listOpen, setListOpen] = React.useState(false);
  const [managerError, setManagerError] = React.useState("");
  
  const safeCategories = Array.isArray(categories) ? categories : [];

  // Reset form when locale changes
  React.useEffect(() => {
    setNewCategoryName("");
    if (editingId) {
      // Reset editing form to show name in new language
      const current = safeCategories.find((c) => c.id === editingId);
      if (current) {
        // Get name from language-specific field
        const nameFieldForLang = getNameFieldForLanguage(primaryLangCode);
        setEditingName(current[nameFieldForLang] || "");
      }
    }
  }, [primaryLangCode, safeCategories, editingId]);

  async function submitNewCategory() {
    try {
      setManagerError("");
      if (!newCategoryName.trim()) {
        setManagerError(t.errorCategoryRequired || "Category name is required.");
        return;
      }
      const nameFieldForLang = getNameFieldForLanguage(primaryLangCode);
      const payload = {
        icon: newCategoryIcon,
        [nameFieldForLang]: newCategoryName
      };
      console.log("[submitNewCategory] Sending payload:", { primaryLangCode, nameFieldForLang, payload });

      await onCreateCategory(payload);
      setNewCategoryName("");
      setNewCategoryIcon("");
      setListOpen(true);
    } catch (err) {
      console.error("[submitNewCategory] Error:", err);
      setManagerError(err?.message || t.errorCategoryRequired || "Failed to add category.");
      logError("CategoryManagerSection.submitNewCategory", err);
    }
  }

  function startEdit(category) {
    setEditingId(category.id);
    const nameFieldForLang = getNameFieldForLanguage(primaryLangCode);
    // Get name in current language from the corresponding field
    const nameInCurrentLang = category[nameFieldForLang] || "";
    setEditingName(nameInCurrentLang);
    setEditingIcon(category.icon || "");
  }

  function cancelEdit() {
    setEditingId("");
    setEditingName("");
    setEditingIcon("");
  }

  async function saveEdit() {
    if (!editingId) {
      return;
    }
    try {
      setManagerError("");
      const nameFieldForLang = getNameFieldForLanguage(primaryLangCode);
      const payload = {
        id: editingId,
        icon: editingIcon,
        [nameFieldForLang]: editingName
      };

      await onUpdateCategory(payload);
      cancelEdit();
    } catch (err) {
      setManagerError(err?.message || t.errorCategoryRequired || "Failed to update category.");
      logError("CategoryManagerSection.saveEdit", err);
    }
  }

  async function moveCategory(id, direction) {
    try {
      const active = safeCategories.filter((item) => Number(item.isActive) === 1);
      const index = active.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= active.length) {
        return;
      }
      const next = [...active];
      const [picked] = next.splice(index, 1);
      next.splice(target, 0, picked);
      try {
        await onReorderCategories(next.map((item) => item.id));
      } catch (err) {
        logError("CategoryManagerSection.moveCategory.onReorder", err);
      }
    } catch (err) {
      logError("CategoryManagerSection.moveCategory", err);
    }
  }

  async function safeDeleteCategory(id) {
    try {
      setManagerError("");
      await onDeleteCategory(id);
    } catch (err) {
      setManagerError(err?.message || t.errorCategoryRequired || "Failed to delete category.");
      logError("CategoryManagerSection.safeDeleteCategory", err);
    }
  }

  async function restoreCategory(id) {
    try {
      setManagerError("");
      await onUpdateCategory({ id, isActive: 1 });
    } catch (err) {
      setManagerError(err?.message || t.errorCategoryRequired || "Failed to restore category.");
      logError("CategoryManagerSection.restoreCategory", err);
    }
  }

  async function safeResetCategories() {
    if (!window.confirm("Are you sure you want to reset categories to default?")) {
      return;
    }
    try {
      setManagerError("");
      await onResetCategories();
    } catch (err) {
      setManagerError(err?.message || t.errorCategoryRequired || "Failed to reset categories.");
      logError("CategoryManagerSection.safeResetCategories", err);
    }
  }

  return (
    <section className="card category-manager-card">
      <div className="category-manager-header">
        <div>
          <h2>{t.categoryManagerTitle}</h2>
          <p className="subtext">{t.categoryManagerSubtext}</p>
        </div>
        <div className="category-manager-actions">
          <button
            type="button"
            className="inline-action"
            onClick={() => setListOpen((v) => !v)}
          >
            {listOpen ? t.categoryHideListButton ?? "▲ Close" : t.categoryShowListButton ?? "▼ Show List"}
          </button>
          <button
            type="button"
            className="inline-action danger-action"
            onClick={safeResetCategories}
          >
            {t.categoryResetButton ?? "Reset to Default"}
          </button>
        </div>
      </div>

      <div className="category-create">
        <div className="category-create-row">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={getLanguageDisplayName(primaryLangCode, safeLocale)}
          />
          <input
            type="text"
            value={newCategoryIcon}
            onChange={(e) => setNewCategoryIcon(e.target.value)}
            placeholder={t.addCategoryIconPlaceholder}
          />
          <button type="button" className="inline-action" onClick={submitNewCategory}>
            {t.addCategoryButton}
          </button>
        </div>
        {managerError && <p className="error">{managerError}</p>}
      </div>

      {listOpen && (
        <ul className="list category-list">
          {safeCategories.map((category) => {
            const isEditing = editingId === category.id;
            const isActive = Number(category.isActive) === 1;
            return (
              <li key={category.id} className="category-row" style={{ opacity: isActive ? 1 : 0.65 }}>
                <span>{category.icon || "\uD83C\uDFF7\uFE0F"}</span>
                <span>{displayName(category, safeLocale)}</span>
                {!isActive && <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>({t.categoryInactiveLabel || "inactive"})</span>}
                {isEditing ? (
                  <div className="category-edit-form">
                    <div className="category-edit-row">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder={getLanguageDisplayName(primaryLangCode, safeLocale)}
                      />
                      <input
                        type="text"
                        value={editingIcon}
                        onChange={(e) => setEditingIcon(e.target.value)}
                        placeholder="Icon"
                      />
                    </div>
                    <div className="category-edit-actions">
                      <button type="button" className="inline-action" onClick={saveEdit}>{t.saveButton}</button>
                      <button type="button" className="inline-action" onClick={cancelEdit}>{t.cancelEditButton}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button type="button" className="inline-action" onClick={() => moveCategory(category.id, -1)}>↑</button>
                    <button type="button" className="inline-action" onClick={() => moveCategory(category.id, 1)}>↓</button>
                    <button type="button" className="inline-action" onClick={() => startEdit(category)}>{t.editRecurringButton}</button>
                    {!isActive && (
                      <button
                        type="button"
                        className="inline-action"
                        onClick={() => restoreCategory(category.id)}
                      >
                        {t.restoreButton || "Restore"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-action"
                      onClick={() => safeDeleteCategory(category.id)}
                      disabled={category.id === "other" || !isActive}
                    >
                      {t.deleteButton}
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
