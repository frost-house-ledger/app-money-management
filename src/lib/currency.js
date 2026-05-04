const CURRENCY_PRESETS = {
  JPY: { locale: "ja-JP", currency: "JPY", maximumFractionDigits: 0 },
  USD: { locale: "en-US", currency: "USD", maximumFractionDigits: 2 },
  EUR: { locale: "de-DE", currency: "EUR", maximumFractionDigits: 2 },
  GBP: { locale: "en-GB", currency: "GBP", maximumFractionDigits: 2 },
  CHF: { locale: "de-CH", currency: "CHF", maximumFractionDigits: 2 },
  CAD: { locale: "en-CA", currency: "CAD", maximumFractionDigits: 2 },
  NZD: { locale: "en-NZ", currency: "NZD", maximumFractionDigits: 2 },
  AUD: { locale: "en-AU", currency: "AUD", maximumFractionDigits: 2 },
  CNY: { locale: "zh-CN", currency: "CNY", maximumFractionDigits: 2 },
  HKD: { locale: "zh-HK", currency: "HKD", maximumFractionDigits: 2 },
  TWD: { locale: "zh-TW", currency: "TWD", maximumFractionDigits: 2 },
  KRW: { locale: "ko-KR", currency: "KRW", maximumFractionDigits: 0 },
  SGD: { locale: "en-SG", currency: "SGD", maximumFractionDigits: 2 },
  THB: { locale: "th-TH", currency: "THB", maximumFractionDigits: 2 },
  MYR: { locale: "ms-MY", currency: "MYR", maximumFractionDigits: 2 },
  IDR: { locale: "id-ID", currency: "IDR", maximumFractionDigits: 0 },
  PHP: { locale: "en-PH", currency: "PHP", maximumFractionDigits: 2 },
  VND: { locale: "vi-VN", currency: "VND", maximumFractionDigits: 0 },
  INR: { locale: "en-IN", currency: "INR", maximumFractionDigits: 2 },
  PKR: { locale: "ur-PK", currency: "PKR", maximumFractionDigits: 2 },
  BDT: { locale: "bn-BD", currency: "BDT", maximumFractionDigits: 2 },
  LKR: { locale: "si-LK", currency: "LKR", maximumFractionDigits: 2 },
  NPR: { locale: "ne-NP", currency: "NPR", maximumFractionDigits: 2 },
  AED: { locale: "ar-AE", currency: "AED", maximumFractionDigits: 2 },
  SAR: { locale: "ar-SA", currency: "SAR", maximumFractionDigits: 2 },
  QAR: { locale: "ar-QA", currency: "QAR", maximumFractionDigits: 2 },
  KWD: { locale: "ar-KW", currency: "KWD", maximumFractionDigits: 3 },
  BHD: { locale: "ar-BH", currency: "BHD", maximumFractionDigits: 3 },
  OMR: { locale: "ar-OM", currency: "OMR", maximumFractionDigits: 3 },
  ILS: { locale: "he-IL", currency: "ILS", maximumFractionDigits: 2 },
  TRY: { locale: "tr-TR", currency: "TRY", maximumFractionDigits: 2 },
  RUB: { locale: "ru-RU", currency: "RUB", maximumFractionDigits: 2 },
  UAH: { locale: "uk-UA", currency: "UAH", maximumFractionDigits: 2 },
  PLN: { locale: "pl-PL", currency: "PLN", maximumFractionDigits: 2 },
  CZK: { locale: "cs-CZ", currency: "CZK", maximumFractionDigits: 2 },
  HUF: { locale: "hu-HU", currency: "HUF", maximumFractionDigits: 2 },
  RON: { locale: "ro-RO", currency: "RON", maximumFractionDigits: 2 },
  BGN: { locale: "bg-BG", currency: "BGN", maximumFractionDigits: 2 },
  DKK: { locale: "da-DK", currency: "DKK", maximumFractionDigits: 2 },
  NOK: { locale: "nb-NO", currency: "NOK", maximumFractionDigits: 2 },
  SEK: { locale: "sv-SE", currency: "SEK", maximumFractionDigits: 2 },
  ISK: { locale: "is-IS", currency: "ISK", maximumFractionDigits: 0 },
  HRK: { locale: "hr-HR", currency: "HRK", maximumFractionDigits: 2 },
  RSD: { locale: "sr-RS", currency: "RSD", maximumFractionDigits: 2 },
  BAM: { locale: "bs-BA", currency: "BAM", maximumFractionDigits: 2 },
  ALL: { locale: "sq-AL", currency: "ALL", maximumFractionDigits: 2 },
  MKD: { locale: "mk-MK", currency: "MKD", maximumFractionDigits: 2 },
  GEL: { locale: "ka-GE", currency: "GEL", maximumFractionDigits: 2 },
  AMD: { locale: "hy-AM", currency: "AMD", maximumFractionDigits: 2 },
  AZN: { locale: "az-AZ", currency: "AZN", maximumFractionDigits: 2 },
  KZT: { locale: "kk-KZ", currency: "KZT", maximumFractionDigits: 2 },
  UZS: { locale: "uz-UZ", currency: "UZS", maximumFractionDigits: 2 },
  KGS: { locale: "ky-KG", currency: "KGS", maximumFractionDigits: 2 },
  TJS: { locale: "tg-TJ", currency: "TJS", maximumFractionDigits: 2 },
  MNT: { locale: "mn-MN", currency: "MNT", maximumFractionDigits: 2 },
  MAD: { locale: "ar-MA", currency: "MAD", maximumFractionDigits: 2 },
  TND: { locale: "ar-TN", currency: "TND", maximumFractionDigits: 3 },
  DZD: { locale: "ar-DZ", currency: "DZD", maximumFractionDigits: 2 },
  EGP: { locale: "ar-EG", currency: "EGP", maximumFractionDigits: 2 },
  ZAR: { locale: "en-ZA", currency: "ZAR", maximumFractionDigits: 2 },
  NGN: { locale: "en-NG", currency: "NGN", maximumFractionDigits: 2 },
  KES: { locale: "en-KE", currency: "KES", maximumFractionDigits: 2 },
  GHS: { locale: "en-GH", currency: "GHS", maximumFractionDigits: 2 },
  ETB: { locale: "am-ET", currency: "ETB", maximumFractionDigits: 2 },
  UGX: { locale: "en-UG", currency: "UGX", maximumFractionDigits: 0 },
  TZS: { locale: "sw-TZ", currency: "TZS", maximumFractionDigits: 2 },
  BWP: { locale: "en-BW", currency: "BWP", maximumFractionDigits: 2 },
  MUR: { locale: "en-MU", currency: "MUR", maximumFractionDigits: 2 },
  BRL: { locale: "pt-BR", currency: "BRL", maximumFractionDigits: 2 },
  ARS: { locale: "es-AR", currency: "ARS", maximumFractionDigits: 2 },
  CLP: { locale: "es-CL", currency: "CLP", maximumFractionDigits: 0 },
  COP: { locale: "es-CO", currency: "COP", maximumFractionDigits: 2 },
  PEN: { locale: "es-PE", currency: "PEN", maximumFractionDigits: 2 },
  MXN: { locale: "es-MX", currency: "MXN", maximumFractionDigits: 2 },
  CRC: { locale: "es-CR", currency: "CRC", maximumFractionDigits: 2 },
  GTQ: { locale: "es-GT", currency: "GTQ", maximumFractionDigits: 2 },
  HNL: { locale: "es-HN", currency: "HNL", maximumFractionDigits: 2 },
  NIO: { locale: "es-NI", currency: "NIO", maximumFractionDigits: 2 },
  PYG: { locale: "es-PY", currency: "PYG", maximumFractionDigits: 0 },
  UYU: { locale: "es-UY", currency: "UYU", maximumFractionDigits: 2 },
  BOB: { locale: "es-BO", currency: "BOB", maximumFractionDigits: 2 },
  DOP: { locale: "es-DO", currency: "DOP", maximumFractionDigits: 2 },
  JMD: { locale: "en-JM", currency: "JMD", maximumFractionDigits: 2 },
  TTD: { locale: "en-TT", currency: "TTD", maximumFractionDigits: 2 },
  BBD: { locale: "en-BB", currency: "BBD", maximumFractionDigits: 2 },
  BSD: { locale: "en-BS", currency: "BSD", maximumFractionDigits: 2 },
  FJD: { locale: "en-FJ", currency: "FJD", maximumFractionDigits: 2 },
  XPF: { locale: "fr-PF", currency: "XPF", maximumFractionDigits: 0 },
  XOF: { locale: "fr-SN", currency: "XOF", maximumFractionDigits: 0 },
  XAF: { locale: "fr-CM", currency: "XAF", maximumFractionDigits: 0 },
  XCD: { locale: "en-AG", currency: "XCD", maximumFractionDigits: 2 }
};

const CURRENCY_ALIASES = {
  YEN: "JPY",
  DOLLAR: "USD",
  EURO: "EUR",
  PFOND: "GBP",
  POUND: "GBP",
  POUNDS: "GBP",
  STERLING: "GBP",
  RMB: "CNY",
  YUAN: "CNY",
  WON: "KRW"
};

export const BASE_CURRENCY_CODE = "JPY";

const FALLBACK_RATES_FROM_JPY = {
  JPY: 1,
  EUR: 0.0054,
  NZD: 0.0108,
  USD: 0.0064,
  GBP: 0.0046
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_PRESETS);

const CURRENCY_ENGLISH_DISPLAY = new Intl.DisplayNames(["en"], { type: "currency" });
const NUMBER_INPUT_DISPLAY = new Intl.NumberFormat("en-US", { maximumFractionDigits: 20 });

export const SUPPORTED_CURRENCY_LIST = SUPPORTED_CURRENCIES.map((code) => ({
  code,
  englishName: CURRENCY_ENGLISH_DISPLAY.of(code) || code
}));

function normalizeCurrencyCode(code) {
  const normalized = String(code || "JPY").trim().toUpperCase();
  return CURRENCY_ALIASES[normalized] || normalized;
}

function getRateFromBase(code, rates = null) {
  const currencyCode = normalizeCurrencyCode(code);
  if (currencyCode === BASE_CURRENCY_CODE) {
    return 1;
  }

  const sourceRates = rates || FALLBACK_RATES_FROM_JPY;
  const rate = sourceRates?.[currencyCode];
  if (!Number.isFinite(rate) || rate <= 0) {
    return null;
  }
  return rate;
}

function roundToCurrencyPrecision(value, code) {
  const currencyCode = normalizeCurrencyCode(code);
  const preset = CURRENCY_PRESETS[currencyCode] || CURRENCY_PRESETS.JPY;
  const digits = preset.maximumFractionDigits ?? 0;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function convertBaseAmountToDisplay(value, code = BASE_CURRENCY_CODE, rates = null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const rate = getRateFromBase(code, rates);
  if (rate == null) {
    return amount;
  }

  return roundToCurrencyPrecision(amount * rate, code);
}

export function convertDisplayAmountToBase(value, code = BASE_CURRENCY_CODE, rates = null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  const rate = getRateFromBase(code, rates);
  if (rate == null) {
    return roundToCurrencyPrecision(amount, BASE_CURRENCY_CODE);
  }

  return roundToCurrencyPrecision(amount / rate, BASE_CURRENCY_CODE);
}

export function formatBaseAmountForInput(value, code = BASE_CURRENCY_CODE, rates = null) {
  const currencyCode = normalizeCurrencyCode(code);
  const preset = CURRENCY_PRESETS[currencyCode] || CURRENCY_PRESETS.JPY;
  const converted = convertBaseAmountToDisplay(value, currencyCode, rates);
  if (preset.maximumFractionDigits > 0) {
    return String(Number(converted.toFixed(preset.maximumFractionDigits)));
  }
  return String(Math.round(converted));
}

export function sanitizeNumericInput(value) {
  const text = String(value ?? "").replace(/,/g, "").trim();
  let normalized = "";
  let hasDecimalPoint = false;

  for (const char of text) {
    if (/\d/.test(char)) {
      normalized += char;
      continue;
    }
    if (char === "." && !hasDecimalPoint) {
      normalized += char;
      hasDecimalPoint = true;
    }
  }

  return normalized;
}

export function formatNumericInput(value) {
  const normalized = sanitizeNumericInput(value);
  if (!normalized) {
    return "";
  }

  const [integerPart, decimalPart] = normalized.split(".");
  const formattedInteger = integerPart
    ? NUMBER_INPUT_DISPLAY.format(Number(integerPart))
    : "0";

  if (normalized.includes(".")) {
    return `${formattedInteger}.${decimalPart ?? ""}`;
  }

  return formattedInteger;
}

export async function loadExchangeRates() {
  if (typeof window !== "undefined" && typeof window.exchangeRatesApi?.fetch === "function") {
    try {
      return await window.exchangeRatesApi.fetch();
    } catch {}
  }
  return null;
}

export function formatCurrency(value, code = "JPY", rates = null) {
  const currencyCode = normalizeCurrencyCode(code);
  const preset = CURRENCY_PRESETS[currencyCode] || CURRENCY_PRESETS.JPY;

  const amount = convertBaseAmountToDisplay(value, currencyCode, rates);

  return new Intl.NumberFormat(preset.locale, {
    style: "currency",
    currency: preset.currency,
    maximumFractionDigits: preset.maximumFractionDigits
  }).format(amount);
}

export function formatYen(value) {
  return formatCurrency(value, "JPY");
}

export function formatUsd(value) {
  return formatCurrency(value, "USD");
}

export function formatEuro(value) {
  return formatCurrency(value, "EUR");
}

export function formatNzd(value) {
  return formatCurrency(value, "NZD");
}

export function formatAud(value) {
  return formatCurrency(value, "AUD");
}

export function formatPound(value) {
  return formatCurrency(value, "GBP");
}
