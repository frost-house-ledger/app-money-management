import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const categoriesPath = path.join(__dirname, "../../json/categories.json");

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

  // Fallback: hardcoded default categories
  cachedCategories = [
    { id: "food", nameJp: "食費", nameEn: "Food", icon: "🍽️", sortOrder: 10 },
    { id: "beverage", nameJp: "飲料", nameEn: "Beverage", icon: "☕", sortOrder: 15 },
    { id: "transport", nameJp: "交通", nameEn: "Transport", icon: "🚌", sortOrder: 20 },
    { id: "housing", nameJp: "住居", nameEn: "Housing", icon: "🏠", sortOrder: 30 },
    { id: "utilities", nameJp: "光熱費", nameEn: "Utilities", icon: "💡", sortOrder: 40 },
    { id: "medical", nameJp: "医療", nameEn: "Medical", icon: "💊", sortOrder: 50 },
    { id: "education", nameJp: "教育", nameEn: "Education", icon: "📚", sortOrder: 60 },
    { id: "entertainment", nameJp: "娯楽", nameEn: "Entertainment", icon: "🎬", sortOrder: 70 },
    { id: "travel", nameJp: "旅行", nameEn: "Travel", icon: "✈️", sortOrder: 75 },
    { id: "subscription", nameJp: "サブスク", nameEn: "Subscription", icon: "🔁", sortOrder: 90 },
    { id: "insurance", nameJp: "保険", nameEn: "Insurance", icon: "🛡️", sortOrder: 100 },
    { id: "salary", nameJp: "💼 給与", nameEn: "💼 Salary", icon: "💼", sortOrder: 105 },
    { id: "investment", nameJp: "📊 投資", nameEn: "📊 Investment", icon: "📊", sortOrder: 107 },
    { id: "other", nameJp: "その他", nameEn: "Other", icon: "📦", sortOrder: 110 }
  ];

  return cachedCategories;
}

export const DEFAULT_CATEGORIES = loadDefaultCategories();
