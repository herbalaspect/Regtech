import type { ComplianceRule, ProductCategory } from "~/lib/types";
import { supplementRules } from "./supplements";
import { hempCbdRules } from "./hemp-cbd";
import { cosmeticRules } from "./cosmetics";
import { otcDrugRules } from "./otc-drugs";
import { essentialOilRules } from "./essential-oils";
import { crossCategoryRules } from "./cross-category";

const categoryRuleMap: Record<string, ComplianceRule[]> = {
  supplement: supplementRules,
  hemp_cbd: hempCbdRules,
  cosmetic: cosmeticRules,
  otc_drug: otcDrugRules,
  essential_oil: essentialOilRules,
};

/**
 * Get all rules applicable to a given product category.
 * Includes category-specific rules + cross-category rules.
 */
export function getAllRulesForCategory(
  category: ProductCategory | "cross_category",
  includeProp65 = true,
): ComplianceRule[] {
  const rules: ComplianceRule[] = [];

  // Add category-specific rules
  if (category !== "unknown" && category !== "cross_category") {
    const categoryRules = categoryRuleMap[category];
    if (categoryRules) {
      rules.push(...categoryRules);
    }
  }

  // Add cross-category rules
  const crossRules = includeProp65
    ? crossCategoryRules
    : crossCategoryRules.filter((r) => r.id !== "cross-prop65-001");

  rules.push(...crossRules);

  return rules;
}

/**
 * Get all built-in rules across all categories.
 */
export function getAllBuiltInRules(): ComplianceRule[] {
  return [
    ...supplementRules,
    ...hempCbdRules,
    ...cosmeticRules,
    ...otcDrugRules,
    ...essentialOilRules,
    ...crossCategoryRules,
  ];
}

/**
 * Get rules for a specific category only (no cross-category).
 */
export function getCategoryRules(category: ProductCategory): ComplianceRule[] {
  return categoryRuleMap[category] || [];
}
