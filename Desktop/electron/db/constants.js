import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const categoriesPath = path.join(__dirname, "../../../json/categories.json");

let cachedCategories = null;

function loadDefaultCategories() {
  if (cachedCategories) {
    return cachedCategories;
  }

  try {
    if (fs.existsSync(categoriesPath)) {
      const raw = JSON.parse(fs.readFileSync(categoriesPath, "utf8"));
      if (Array.isArray(raw.items)) {
        cachedCategories = raw.items;
        return cachedCategories;
      }
    }
  } catch (e) {
    console.warn(`Failed to load categories from ${categoriesPath}:`, e.message);
  }

  cachedCategories = [];

  return cachedCategories;
}

export const DEFAULT_CATEGORIES = loadDefaultCategories();
