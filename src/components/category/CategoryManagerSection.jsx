import React from "react";
import { logError } from "../../lib/logger.js";

function displayName(category, locale) {
  // Prefer English names for management UI; show Japanese only when locale is Japanese
  const raw = String(locale || '').toLowerCase();
  if (raw === 'jp' || raw === 'ja') {
    return category.nameJp || category.nameEn || category.nameDe || category.id;
  }
  return category.nameEn || category.nameJp || category.nameDe || category.id;
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
  const [newCategoryNameJp, setNewCategoryNameJp] = React.useState("");
  const [newCategoryNameEn, setNewCategoryNameEn] = React.useState("");
  const [newCategoryIcon, setNewCategoryIcon] = React.useState("");
  const [editingId, setEditingId] = React.useState("");
  const [editingJp, setEditingJp] = React.useState("");
  const [editingEn, setEditingEn] = React.useState("");
  const [editingIcon, setEditingIcon] = React.useState("");
  const [listOpen, setListOpen] = React.useState(false);
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeLocale = locale || "jp";

  async function submitNewCategory() {
    try {
      await onCreateCategory({
        nameJp: newCategoryNameJp,
        nameEn: newCategoryNameEn,
        icon: newCategoryIcon
      });
      setNewCategoryNameJp("");
      setNewCategoryNameEn("");
      setNewCategoryIcon("");
    } catch (err) {
      logError("CategoryManagerSection.submitNewCategory", err);
    }
  }

  function startEdit(category) {
    setEditingId(category.id);
    setEditingJp(category.nameJp);
    setEditingEn(category.nameEn);
    setEditingIcon(category.icon || "");
  }

  function cancelEdit() {
    setEditingId("");
    setEditingJp("");
    setEditingEn("");
    setEditingIcon("");
  }

  async function saveEdit() {
    if (!editingId) {
      return;
    }
    try {
      const payload = {
        id: editingId,
        nameJp: editingJp,
        nameEn: editingEn,
        icon: editingIcon
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
            value={newCategoryNameJp}
            onChange={(e) => setNewCategoryNameJp(e.target.value)}
            placeholder={t.categoryNameJpPlaceholder}
          />
          <input
            type="text"
            value={newCategoryNameEn}
            onChange={(e) => setNewCategoryNameEn(e.target.value)}
            placeholder={t.categoryNameEnPlaceholder}
          />
          {/* JP + EN only */}
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
                  <>
                    <input value={editingJp} onChange={(e) => setEditingJp(e.target.value)} />
                    <input value={editingEn} onChange={(e) => setEditingEn(e.target.value)} />
                    <input value={editingIcon} onChange={(e) => setEditingIcon(e.target.value)} />
                    <button type="button" className="inline-action" onClick={saveEdit}>{t.saveButton}</button>
                    <button type="button" className="inline-action" onClick={cancelEdit}>{t.cancelEditButton}</button>
                  </>
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
