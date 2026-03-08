import type { ComplianceRule } from "~/lib/types";
import {
  DSHEA_DISCLAIMER_VARIANTS,
  DRUG_CLAIM_KEYWORDS,
} from "~/lib/constants";

export const supplementRules: ComplianceRule[] = [
  // ── DSHEA Disclaimer (CRITICAL) ──────────────────────────────────
  {
    id: "supp-dshea-001",
    category: "supplement",
    ruleType: "presence",
    severity: "critical",
    name: "Missing FDA Disclaimer (DSHEA)",
    description:
      "Dietary supplement products must include the DSHEA disclaimer: " +
      '"These statements have not been evaluated by the Food and Drug Administration. ' +
      'This product is not intended to diagnose, treat, cure, or prevent any disease."',
    keywords: DSHEA_DISCLAIMER_VARIANTS,
    enabled: true,
  },

  // ── Drug Claims (CRITICAL) ───────────────────────────────────────
  {
    id: "supp-drug-001",
    category: "supplement",
    ruleType: "absence",
    severity: "critical",
    name: "Prohibited Drug Claims",
    description:
      "Dietary supplements cannot claim to diagnose, treat, cure, or prevent any disease. " +
      "This product listing contains language that may constitute a drug claim.",
    keywords: DRUG_CLAIM_KEYWORDS,
    enabled: true,
  },

  // ── Supplement Facts Reference (WARNING) ─────────────────────────
  {
    id: "supp-facts-001",
    category: "supplement",
    ruleType: "presence",
    severity: "warning",
    name: "Missing Supplement Facts Reference",
    description:
      "Supplement listings should reference a Supplement Facts panel with serving size, " +
      "ingredients, and % Daily Values.",
    keywords: [
      "supplement facts",
      "serving size",
      "daily value",
      "amount per serving",
    ],
    enabled: true,
  },

  // ── Allergen Warnings (WARNING) ──────────────────────────────────
  {
    id: "supp-allergen-001",
    category: "supplement",
    ruleType: "pattern",
    severity: "warning",
    name: "Potential Allergen Without Warning",
    description:
      "Product mentions common allergens but may not include proper allergen warnings. " +
      "Products containing major allergens must disclose them clearly.",
    // Matches allergen names not preceded by "warning" or "allergen" or "contains"
    pattern:
      "(?:milk|eggs?|fish|shellfish|tree nuts?|peanuts?|wheat|soy(?:beans?)?|sesame|gluten)",
    enabled: true,
  },

  // ── Dosage/Quantity Claims (WARNING) ─────────────────────────────
  {
    id: "supp-dosage-001",
    category: "supplement",
    ruleType: "absence",
    severity: "warning",
    name: "Potentially Misleading Potency Claims",
    description:
      "Claims about maximum strength, highest potency, or clinical dosage should be " +
      "substantiated with evidence.",
    keywords: [
      "maximum strength",
      "highest potency",
      "clinical dose",
      "mega dose",
      "ultra potent",
      "pharmaceutical grade",
      "hospital grade",
    ],
    enabled: true,
  },

  // ── Weight Loss Drug Claims (CRITICAL) ───────────────────────────
  {
    id: "supp-weight-001",
    category: "supplement",
    ruleType: "absence",
    severity: "critical",
    name: "Unsubstantiated Weight Loss Claims",
    description:
      "Weight loss claims on supplements require substantiation by competent and reliable " +
      "scientific evidence. Specific outcome claims are likely to violate FTC guidelines.",
    keywords: [
      "lose weight fast",
      "rapid weight loss",
      "burn fat instantly",
      "melt fat",
      "lose 10 pounds",
      "lose 20 pounds",
      "guaranteed weight loss",
      "no diet no exercise",
      "effortless weight loss",
      "belly fat burner",
    ],
    enabled: true,
  },

  // ── Before/After Claims (WARNING) ────────────────────────────────
  {
    id: "supp-testimony-001",
    category: "supplement",
    ruleType: "absence",
    severity: "warning",
    name: "Potentially Misleading Testimonial Claims",
    description:
      "Before/after claims and specific result testimonials must represent typical results " +
      "and be substantiated. FTC requires that endorsements reflect typical consumer experience.",
    keywords: [
      "before and after",
      "results may vary",
      "individual results",
      "lost 30 pounds",
      "lost 50 pounds",
      "typical results",
    ],
    enabled: true,
  },
];
