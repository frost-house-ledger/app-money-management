import categoriesData from "../../json/categories.json";
import { getCategoryName } from "../i18n/translations.js";

export const DAILY_CATEGORY_DEFINITIONS = categoriesData.items || [];

// Keep categories data minimal: use id as canonical key
export const DAILY_FEE_CATEGORIES = DAILY_CATEGORY_DEFINITIONS.map((item) => item.id);

export const DAILY_CATEGORY_ICONS = Object.fromEntries(
  DAILY_CATEGORY_DEFINITIONS.map((item) => [item.id, item.icon])
);

export function getCategoryLabelByLocale(itemOrId, locale = "jp") {
  if (!itemOrId) return "";
  const id = typeof itemOrId === "string" ? itemOrId : itemOrId.id || itemOrId.name || null;
  if (!id) return "";
  return getCategoryName(id, locale);
}
