# Localization

Guide to multi-language support in HouseLedger.

## Supported Languages

HouseLedger supports **11 languages** across multiple regions and writing systems:

| Code | Language | Region | Script | Status |
|------|----------|--------|--------|--------|
| en | English | Global | LTR | ✅ Complete |
| ja | 日本語 | Japan | LTR | ✅ Complete |
| de | Deutsch | Germany/Austria | LTR | ✅ Complete |
| es | Español | Spain/Latin America | LTR | ✅ Complete |
| pt | Português | Portugal/Brazil | LTR | ✅ Complete |
| it | Italiano | Italy | LTR | ✅ Complete |
| fr | Français | France/Belgium | LTR | ✅ Complete |
| ru | Русский | Russia/Ukraine | LTR | ✅ Complete |
| tw | 繁體中文 | Taiwan/Hong Kong | LTR | ✅ Complete |
| ko | 한국어 | South Korea | LTR | ✅ Complete |
| ar | العربية | Middle East | RTL | ✅ Complete |

---

## Translation System

### Translation File

All strings are in `src/i18n/translations.js`:

```javascript
const TRANSLATIONS = {
  // String key → translations for each language
  categoryLabel: {
    jp: "カテゴリ",
    en: "Category",
    de: "Kategorie",
    es: "Categoría",
    pt: "Categoria",
    it: "Categoria",
    fr: "Catégorie",
    ru: "Категория",
    tw: "類別",
    ko: "카테고리",
    ar: "فئة"
  },

  amountLabel: {
    jp: "金額",
    en: "Amount",
    de: "Betrag",
    es: "Cantidad",
    pt: "Valor",
    it: "Importo",
    fr: "Montant",
    ru: "Сумма",
    tw: "金額",
    ko: "금액",
    ar: "المبلغ"
  },
  
  // 100+ more keys...
};
```

### Translation Object Structure

```javascript
// Each key maps to an object with language codes
key: {
  jp: "Japanese text",
  en: "English text",
  // ... 9 more languages
}
```

### Getting Translations

In React components:

```javascript
import { getMessages } from "../../i18n/translations.js";

function MyComponent() {
  // Get translation object for current locale
  const t = useMemo(() => getMessages(locale), [locale]);
  
  // Use translations
  return (
    <div>
      <label>{t.categoryLabel}</label>
      <input placeholder={t.amountPlaceholder} />
      <button>{t.saveButton}</button>
    </div>
  );
}
```

---

## Language Selection

### User Interface

1. Go to **Settings** page
2. Select **Language** dropdown
3. Choose from list (all 11 languages)
4. UI updates immediately

### Persistence

Selected language saved to localStorage:

```javascript
localStorage.setItem("settings.locale", "ja");
// Next time app starts, loads in Japanese
```

### Default Language

```javascript
const [locale, setLocale] = useState(() => {
  return localStorage.getItem("settings.locale") || "en";
});
```

Default: **English** (if not set previously)

---

## Locale-Aware Formatting

### Dates

Formatting changes based on locale:

```javascript
// Date formatting utilities in src/lib/date.js
formatDate("2023-01-15", "en") // "1/15/2023" or "15-Jan-2023"
formatDate("2023-01-15", "ja") // "2023年1月15日"
formatDate("2023-01-15", "de") // "15.01.2023"
```

### Numbers

Number formatting varies by language/region:

```javascript
// Number formatting utilities in src/lib/currency.js
formatNumber(1234.56, "en")    // "1,234.56"
formatNumber(1234.56, "de")    // "1.234,56"
formatNumber(1234.56, "fr")    // "1 234,56"

// Currency
formatCurrency(1000, "JPY", "en")   // "¥1,000"
formatCurrency(1000, "USD", "en")   // "$1,000.00"
formatCurrency(1000, "EUR", "de")   // "1.000,00 €"
```

### Category Names

Category names translated for current locale:

```javascript
// CategoryNames defined in translations.js
TRANSLATIONS.categoryNames = {
  food: {
    jp: "食費",
    en: "Food",
    de: "Essen",
    // ... other languages
  },
  // ... 12 more categories
};

// Usage:
<span>{getCategoryName(categoryId, locale)}</span>
// Displays: "食費" (if ja) or "Food" (if en), etc.
```

---

## Adding a New Language

### Step 1: Add Language Code

Edit `src/i18n/translations.js`:

```javascript
// At the top of the file, add to the supported list
const SUPPORTED_LANGUAGES = [
  'en', 'ja', 'de', 'es', 'pt', 'it', 'fr', 'ru', 'tw', 'ko', 'ar',
  'zh' // NEW language code
];
```

### Step 2: Add Translations

For each key in `TRANSLATIONS`, add the new language:

```javascript
categoryLabel: {
  jp: "カテゴリ",
  en: "Category",
  de: "Kategorie",
  // ... existing
  zh: "类别"  // NEW translation
},
```

Repeat for all 100+ keys.

### Step 3: Add to Language Selector

Edit `src/components/settings/SettingsPage.jsx`:

```javascript
const languageOptions = [
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "de", name: "Deutsch" },
  // ... existing
  { code: "zh", name: "简体中文" }  // NEW option
];
```

### Step 4: Add to Category Names

Edit the `categoryNames` section in translations.js:

```javascript
TRANSLATIONS.categoryNames = {
  food: {
    jp: "食費",
    en: "Food",
    // ... existing
    zh: "食品"  // NEW
  },
  // ... all other categories
};
```

### Step 5: Update localeCode in languages.json

Edit `json/languages.json`:

```json
[
  { "code": "en", "name": "English", "localeCode": "en-US", "dir": "ltr" },
  { "code": "ja", "name": "日本語", "localeCode": "ja-JP", "dir": "ltr" },
  // ...
  { "code": "zh", "name": "简体中文", "localeCode": "zh-CN", "dir": "ltr" }
]
```

### Step 6: Test

1. Rebuild: `npm run react:build`
2. Start: `npm run dev`
3. Go to Settings → Language
4. Select new language
5. Verify all text displays correctly

---

## Translation Coverage Checklist

### UI Strings (App Component)

- ✅ Page titles
- ✅ Button labels
- ✅ Form labels
- ✅ Placeholder text
- ✅ Error messages
- ✅ Validation messages
- ✅ Toast notifications

### Category Names

- ✅ Food, Beverage, Transport, Housing, etc.
- ✅ All 13 default categories

### Form Labels

- ✅ Type (Fee/Income)
- ✅ Amount
- ✅ Category
- ✅ Date
- ✅ Title
- ✅ Note

### Buttons

- ✅ Save, Cancel, Delete
- ✅ Edit, Back, Sync Now
- ✅ Add, Remove, Reset

### Charts & Analysis

- ✅ Chart titles
- ✅ Axis labels
- ✅ Legend labels
- ✅ Percentage text

---

## Right-to-Left (RTL) Support

Arabic is RTL (right-to-left). Layout adjusts automatically:

### RTL Styling

```css
/* Base (LTR) */
.container {
  padding-left: 20px;
  text-align: left;
}

/* RTL Override */
[dir="rtl"] .container {
  padding-right: 20px;
  text-align: right;
  padding-left: 0;
}
```

### HTML dir Attribute

```javascript
useEffect(() => {
  const dir = isRTL(locale) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
}, [locale]);
```

---

## Common Translation Issues

### Issue: Text Too Long

**Problem:** German text is longer than English, breaks layout.

**Solution:**
```css
/* Use flexible layouts */
.button {
  min-width: 80px;  /* Minimum, grows with content */
  white-space: nowrap;  /* Prevent wrapping */
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### Issue: Numbers Formatted Wrong

**Problem:** Decimal separator is comma in some locales.

**Solution:** Use `formatCurrency()` and `formatNumber()` utilities:
```javascript
const formatted = formatCurrency(amount, currency, locale);
// Automatically handles comma vs period
```

### Issue: Missing Translations

**Problem:** Key exists in English but not in new language.

**Solution:** Add missing translations before release.

**Prevention:**
```javascript
function getMessages(locale) {
  const messages = TRANSLATIONS[locale];
  // Fall back to English if key missing
  return new Proxy(messages, {
    get: (target, prop) => {
      return target[prop] || TRANSLATIONS.en[prop];
    }
  });
}
```

---

## Testing Translations

### Manual Testing

1. **Change language** → Settings → Language
2. **Check each page:**
   - Daily Entry
   - Monthly Entry
   - History
   - Analysis
   - Settings
   - Statistics
3. **Verify formatting:**
   - Dates display correctly
   - Numbers formatted with correct separators
   - Currency symbols in right position

### Automated Testing

In Jest tests, mock translations:

```javascript
const mockT = {
  categoryLabel: "Category",
  amountLabel: "Amount",
  // ... all keys used in component
};

render(<MyComponent t={mockT} />);
```

---

## Translation Maintenance

### Adding New Strings

1. Add key to `TRANSLATIONS` object
2. Provide all 11 language versions
3. Update component to use `t.newKey`
4. Test in at least English and Japanese

### Updating Existing Strings

1. Edit all language versions
2. Test that change displays correctly
3. Commit changes

### Removing Strings

1. Remove key from `TRANSLATIONS`
2. Update components using the key
3. Test that no "undefined" appears

---

## Resources

- [ISO 639-1 Language Codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
- [Locale Data](https://cldr.unicode.org/)
- [RTL Styling Guide](https://www.w3.org/International/questions/qa-html-dir)

---

## Next Steps

- [Features](07-Features.md) — Language selector feature
- [Development Guide](05-Development-Guide.md) — Adding UI strings
- [FAQ & Troubleshooting](13-FAQ-Troubleshooting.md) — Language issues
