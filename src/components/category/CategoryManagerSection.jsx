import React from "react";
import { logError } from "../../lib/logger.js";
import languagesData from "../../../json/languages.json";

// Build LANGUAGE_INFO from languages.json
const LANGUAGE_INFO = {};
if (Array.isArray(languagesData?.items)) {
  languagesData.items.forEach(item => {
    LANGUAGE_INFO[item.code] = {
      code: item.code,
      nameJa: item.nameJa,
      nameEn: item.nameEn
    };
  });
}

// Generate field name from language code (e.g., "ru" -> "nameRu", "jp" -> "nameJp")
function getNameFieldForLanguage(langCode) {
  if (!langCode) return "nameEn";
  const code = String(langCode).toLowerCase();
  if (code === "jp") return "nameJp";
  if (code === "en") return "nameEn";
  // For other languages, capitalize first letter: ru -> nameRu, de -> nameDe, etc.
  return "name" + code.charAt(0).toUpperCase() + code.slice(1);
}

function getLanguageCode(locale) {
  const raw = String(locale || "").toLowerCase();
  const info = LANGUAGE_INFO[raw];
  return info ? info.code : "en";
}

function getLanguageDisplayName(langCode, displayLocale = "jp") {
  const info = Object.values(LANGUAGE_INFO).find((i) => i.code === langCode);
  if (!info) return langCode;
  const isJp = String(displayLocale || "").toLowerCase().startsWith("jp");
  return isJp ? info.nameJa : info.nameEn;
}

function displayName(category, locale) {
  // Get name in the appropriate language field
  const langCode = getLanguageCode(locale);
  const nameField = getNameFieldForLanguage(langCode);
  // Try to get name from language-specific field first, then fallback to other language fields
  if (category[nameField]) {
    return category[nameField];
  }
  // Fallback: try other common fields
  return category.nameJp || category.nameEn || category.id;
}

export default function CategoryManagerSection({
  categories,
  locale,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
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
      if (!newCategoryName.trim()) {
        return;
      }
      const nameFieldForLang = getNameFieldForLanguage(primaryLangCode);
      const payload = {
        icon: newCategoryIcon,
        [nameFieldForLang]: newCategoryName
      };
      
      await onCreateCategory(payload);
      setNewCategoryName("");
      setNewCategoryIcon("");
    } catch (err) {
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
      const nameFieldForLang = getNameFieldForLanguage(primaryLangCode);
      const payload = {
        id: editingId,
        icon: editingIcon,
        [nameFieldForLang]: editingName
      };
      
      await onUpdateCategory(payload);
      cancelEdit();
    } catch (err) {
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
      await onDeleteCategory(id);
    } catch (err) {
      logError("CategoryManagerSection.safeDeleteCategory", err);
    }
  }

  return (
    <section className="card category-manager-card">
      <div className="category-manager-header">
        <div>
          <h2>{t.categoryManagerTitle}</h2>
          <p className="subtext">{t.categoryManagerSubtext}</p>
        </div>
        <button
          type="button"
          className="inline-action"
          onClick={() => setListOpen((v) => !v)}
        >
          {listOpen ? t.categoryHideListButton ?? "▲ Close" : t.categoryShowListButton ?? "▼ Show List"}
        </button>
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
      </div>

      {listOpen && (
        <ul className="list category-list">
          {safeCategories.map((category) => {
            const isEditing = editingId === category.id;
            return (
              <li key={category.id} className="category-row">
                <span>{category.icon || "\uD83C\uDFF7\uFE0F"}</span>
                <span>{displayName(category, safeLocale)}</span>
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
                    <button
                      type="button"
                      className="inline-action"
                      onClick={() => safeDeleteCategory(category.id)}
                      disabled={category.id === "other"}
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
