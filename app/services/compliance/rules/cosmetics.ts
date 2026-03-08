import type { ComplianceRule } from "~/lib/types";
import {
  COSMETIC_DRUG_CLAIM_KEYWORDS,
  PROHIBITED_COSMETIC_INGREDIENTS,
} from "~/lib/constants";

export const cosmeticRules: ComplianceRule[] = [
  // ── Drug Claims on Cosmetics (CRITICAL) ──────────────────────────
  {
    id: "cosm-drug-001",
    category: "cosmetic",
    ruleType: "absence",
    severity: "critical",
    name: "Drug Claims on Cosmetic Product",
    description:
      "Cosmetic products cannot make claims that they treat, cure, or mitigate disease " +
      "or affect the structure/function of the body. Such claims reclassify the product as a drug, " +
      "requiring FDA approval.",
    keywords: COSMETIC_DRUG_CLAIM_KEYWORDS,
    enabled: true,
  },

  // ── Prohibited Ingredients (CRITICAL) ────────────────────────────
  {
    id: "cosm-ingredient-001",
    category: "cosmetic",
    ruleType: "absence",
    severity: "critical",
    name: "Prohibited Ingredient Listed",
    description:
      "This product lists or references an ingredient that is prohibited or restricted in " +
      "cosmetic products by the FDA (e.g., mercury, hydroquinone for OTC use).",
    keywords: PROHIBITED_COSMETIC_INGREDIENTS,
    enabled: true,
  },

  // ── Ingredient List Presence (WARNING) ───────────────────────────
  {
    id: "cosm-ingredients-001",
    category: "cosmetic",
    ruleType: "presence",
    severity: "warning",
    name: "Missing Ingredient Declaration",
    description:
      "Cosmetic products must include a complete ingredient declaration per the Fair Packaging " +
      "and Labeling Act. Ingredients should be listed in descending order by weight.",
    keywords: [
      "ingredients:",
      "ingredient list",
      "contains:",
      "ingredients list",
      "active ingredients",
      "key ingredients",
      "full ingredients",
    ],
    enabled: true,
  },

  // ── Sunscreen Without SPF Substantiation (WARNING) ───────────────
  {
    id: "cosm-spf-001",
    category: "cosmetic",
    ruleType: "pattern",
    severity: "warning",
    name: "SPF Claim May Require OTC Drug Compliance",
    description:
      "Products claiming SPF protection are classified as OTC drugs by the FDA and must " +
      "comply with the sunscreen monograph, including approved active ingredients and " +
      "Drug Facts labeling.",
    pattern: "spf\\s*\\d+",
    enabled: true,
  },

  // ── Anti-Aging Drug Claims (WARNING) ─────────────────────────────
  {
    id: "cosm-aging-001",
    category: "cosmetic",
    ruleType: "absence",
    severity: "warning",
    name: "Anti-Aging Claims May Cross Drug Boundary",
    description:
      "Claims about reversing aging, eliminating wrinkles, or restructuring skin cross " +
      "from cosmetic into drug territory. Cosmetics can only claim to temporarily improve appearance.",
    keywords: [
      "reverses aging",
      "eliminates wrinkles",
      "erases fine lines",
      "permanently reduces",
      "restructures skin",
      "repairs DNA",
      "repairs cellular damage",
      "turns back the clock",
      "anti-wrinkle treatment",
    ],
    enabled: true,
  },

  // ── External Use Statement (INFO) ────────────────────────────────
  {
    id: "cosm-external-001",
    category: "cosmetic",
    ruleType: "presence",
    severity: "info",
    name: 'Consider Adding "For External Use Only"',
    description:
      "Topical cosmetic products should include a statement indicating they are for " +
      "external use only to prevent misuse.",
    keywords: [
      "external use only",
      "for external use",
      "not for internal use",
      "topical use only",
    ],
    enabled: true,
  },

  // ── Organic/Natural Claims (WARNING) ─────────────────────────────
  {
    id: "cosm-organic-001",
    category: "cosmetic",
    ruleType: "absence",
    severity: "warning",
    name: "Potentially Misleading Organic/Natural Claims",
    description:
      "Claims of 'organic' or '100% natural' on cosmetics should be accurate. " +
      "FDA does not define 'natural' for cosmetics, and USDA organic standards " +
      "apply if using the USDA organic seal.",
    keywords: [
      "100% organic",
      "certified organic",
      "usda organic",
      "100% natural",
      "all natural",
      "chemical free",
      "chemical-free",
      "toxin free",
      "toxin-free",
    ],
    enabled: true,
  },
];
