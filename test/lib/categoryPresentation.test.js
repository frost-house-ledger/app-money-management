import {
  deduplicateCategoriesById,
  resolveCategoryLabel,
} from "../../src/lib/categoryPresentation.js";

describe("resolveCategoryLabel", () => {
  it.each([
    ["ja", "食費"],
    ["en", "Food"],
    ["de", "Essen"],
    ["fr", "Nourriture"],
    ["es", "Comida"],
  ])("localizes built-in categories for %s", (locale, expected) => {
    expect(
      resolveCategoryLabel({ id: "food", nameEn: "Food" }, "food", locale)
    ).toBe(expected);
  });

  it("prefers the saved localized name for custom categories", () => {
    expect(
      resolveCategoryLabel(
        { id: "custom", nameJp: "特別費", nameEn: "Special" },
        "custom",
        "ja"
      )
    ).toBe("特別費");
  });

  it("falls back to the available saved name for custom categories", () => {
    expect(
      resolveCategoryLabel({ id: "custom", nameEn: "Special" }, "custom", "ja")
    ).toBe("Special");
    expect(
      resolveCategoryLabel({ id: "custom", nameEn: "Special" }, "custom", "de")
    ).toBe("Special");
  });

  it("resolves translations when category IDs use hyphens", () => {
    expect(
      resolveCategoryLabel(
        { id: "home-maintenance", nameEn: "Home Maintenance" },
        "home-maintenance",
        "de"
      )
    ).toBe("Hauswartung");
  });
});

describe("deduplicateCategoriesById", () => {
  it("prefers the lowercase canonical category when ids differ only by case", () => {
    const legacyCategory = { id: "Food", nameEn: "Food", icon: "🏷️" };
    const canonicalCategory = { id: "food", nameJp: "食費", nameEn: "Food", icon: "🍽️" };

    expect(
      deduplicateCategoriesById([canonicalCategory, legacyCategory])
    ).toEqual([canonicalCategory]);
    expect(
      deduplicateCategoriesById([legacyCategory, canonicalCategory])
    ).toEqual([canonicalCategory]);
  });
});
