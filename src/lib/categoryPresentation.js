import { getCategoryName } from "../i18n/translations.js";

export function deduplicateCategoriesById(categories) {
  const categoriesById = new Map();
  const categoriesWithoutId = [];

  for (const category of categories) {
    const id = String(category?.id || "");
    const key = id.toLowerCase();
    if (!key) {
      categoriesWithoutId.push(category);
      continue;
    }

    const current = categoriesById.get(key);
    if (!current || (id === key && String(current.id) !== key)) {
      categoriesById.set(key, category);
    }
  }

  return [...categoriesById.values(), ...categoriesWithoutId];
}

export function resolveCategoryLabel(category, categoryId, locale) {
  const id = String(categoryId || category?.id || "").toLowerCase();
  const baseLocale = String(locale || "").toLowerCase().split("-")[0];
  const languageCode = baseLocale === "ja" ? "Jp" : baseLocale === "jp"
    ? "Jp"
    : baseLocale.charAt(0).toUpperCase() + baseLocale.slice(1);
  const preferredName = baseLocale === "ja" || baseLocale === "jp"
    ? category?.nameJp || category?.nameJa
    : category?.[`name${languageCode}`];
  const translatedName = getCategoryName(id, locale);
  const alternateIdTranslation = getCategoryName(id.replace(/-/g, "_"), locale);
  const localizedName = translatedName && translatedName.toLowerCase() !== id
    ? translatedName
    : alternateIdTranslation && alternateIdTranslation.toLowerCase() !== id.replace(/-/g, "_")
      ? alternateIdTranslation
      : null;
  const alternateName = category?.nameEn || category?.nameJp || category?.nameJa || category?.name;

  return preferredName || localizedName || alternateName || id || "-";
}
