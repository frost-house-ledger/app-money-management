import React from "react";

function displayName(category, locale) {
  if (locale === "de") {
    return category.nameDe;
  }
  if (locale === "en") {
    return category.nameEn;
  }
  return category.nameJp;
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
  const [newCategoryNameDe, setNewCategoryNameDe] = React.useState("");
  const [newCategoryIcon, setNewCategoryIcon] = React.useState("");
  const [editingId, setEditingId] = React.useState("");
  const [editingJp, setEditingJp] = React.useState("");
  const [editingEn, setEditingEn] = React.useState("");
  const [editingDe, setEditingDe] = React.useState("");
  const [editingIcon, setEditingIcon] = React.useState("");
  const [listOpen, setListOpen] = React.useState(false);

  async function submitNewCategory() {
    await onCreateCategory({
      nameJp: newCategoryNameJp,
      nameEn: newCategoryNameEn,
      nameDe: newCategoryNameDe,
      icon: newCategoryIcon
    });
    setNewCategoryNameJp("");
    setNewCategoryNameEn("");
    setNewCategoryNameDe("");
    setNewCategoryIcon("");
  }

  function startEdit(category) {
    setEditingId(category.id);
    setEditingJp(category.nameJp);
    setEditingEn(category.nameEn);
    setEditingDe(category.nameDe);
    setEditingIcon(category.icon || "");
  }

  function cancelEdit() {
    setEditingId("");
    setEditingJp("");
    setEditingEn("");
    setEditingDe("");
    setEditingIcon("");
  }

  async function saveEdit() {
    if (!editingId) {
      return;
    }
    await onUpdateCategory({
      id: editingId,
      nameJp: editingJp,
      nameEn: editingEn,
      nameDe: editingDe,
      icon: editingIcon
    });
    cancelEdit();
  }

  async function moveCategory(id, direction) {
    const active = categories.filter((item) => Number(item.isActive) === 1);
    const index = active.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= active.length) {
      return;
    }
    const next = [...active];
    const [picked] = next.splice(index, 1);
    next.splice(target, 0, picked);
    await onReorderCategories(next.map((item) => item.id));
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
          <input
            type="text"
            value={newCategoryNameDe}
            onChange={(e) => setNewCategoryNameDe(e.target.value)}
            placeholder={t.categoryNameDePlaceholder}
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
          {categories.map((category) => {
            const isEditing = editingId === category.id;
            return (
              <li key={category.id} className="category-row">
                <span>{category.icon || "\uD83C\uDFF7\uFE0F"}</span>
                <span>{displayName(category, locale)}</span>
                {isEditing ? (
                  <>
                    <input value={editingJp} onChange={(e) => setEditingJp(e.target.value)} />
                    <input value={editingEn} onChange={(e) => setEditingEn(e.target.value)} />
                    <input value={editingDe} onChange={(e) => setEditingDe(e.target.value)} />
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
                      onClick={() => onDeleteCategory(category.id)}
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
