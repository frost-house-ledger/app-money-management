import dailyCategoryDefinitions from "./dailyCategories.json";

export const DAILY_CATEGORY_DEFINITIONS = dailyCategoryDefinitions;

export const DAILY_FEE_CATEGORIES = DAILY_CATEGORY_DEFINITIONS.map((item) => item.name);

export const DAILY_CATEGORY_ICONS = Object.fromEntries(
  DAILY_CATEGORY_DEFINITIONS.map((item) => [item.name, item.icon])
);
