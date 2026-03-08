import type { ComplianceRule } from "~/lib/types";

export const otcDrugRules: ComplianceRule[] = [
  // ── Drug Facts Label (CRITICAL) ──────────────────────────────────
  {
    id: "otc-facts-001",
    category: "otc_drug",
    ruleType: "presence",
    severity: "critical",
    name: "Missing Drug Facts Reference",
    description:
      "OTC drug products must include a Drug Facts label with active ingredients, uses, " +
      "warnings, directions, and inactive ingredients in the standardized format.",
    keywords: [
      "drug facts",
      "active ingredient",
      "active ingredients",
    ],
    enabled: true,
  },

  // ── Active Ingredient Disclosure (CRITICAL) ──────────────────────
  {
    id: "otc-active-001",
    category: "otc_drug",
    ruleType: "presence",
    severity: "critical",
    name: "Missing Active Ingredient Disclosure",
    description:
      "OTC drugs must clearly state the active ingredient(s) and their concentration. " +
      "This is required by FDA Drug Facts labeling regulations.",
    keywords: [
      "active ingredient",
      "active ingredients",
      "active:",
      "each tablet contains",
      "each capsule contains",
      "each ml contains",
    ],
    enabled: true,
  },

  // ── Warnings Section (CRITICAL) ──────────────────────────────────
  {
    id: "otc-warning-001",
    category: "otc_drug",
    ruleType: "presence",
    severity: "critical",
    name: "Missing Required Warnings",
    description:
      "OTC drug products must include appropriate warnings about when to stop use, " +
      "when to consult a doctor, and substances/activities to avoid.",
    keywords: [
      "warnings",
      "warning:",
      "stop use",
      "ask a doctor",
      "consult a doctor",
      "do not use if",
      "keep out of reach",
    ],
    enabled: true,
  },

  // ── Directions for Use (WARNING) ─────────────────────────────────
  {
    id: "otc-directions-001",
    category: "otc_drug",
    ruleType: "presence",
    severity: "warning",
    name: "Missing Directions for Use",
    description:
      "OTC drugs must include clear directions for safe and effective use, including " +
      "dosage amounts, frequency, and any age-specific instructions.",
    keywords: [
      "directions",
      "directions:",
      "how to use",
      "dosage",
      "apply to",
      "adults and children",
    ],
    enabled: true,
  },

  // ── External Use Only (WARNING) ──────────────────────────────────
  {
    id: "otc-external-001",
    category: "otc_drug",
    ruleType: "presence",
    severity: "warning",
    name: 'Missing "For External Use Only" Statement',
    description:
      "Topical OTC drug products must include a clear statement that the product is " +
      "for external use only.",
    keywords: [
      "external use only",
      "for external use",
      "not for internal use",
      "topical use only",
    ],
    enabled: true,
  },

  // ── Prescription Claims (CRITICAL) ───────────────────────────────
  {
    id: "otc-rx-001",
    category: "otc_drug",
    ruleType: "absence",
    severity: "critical",
    name: "Prescription Drug Claims on OTC Product",
    description:
      "OTC products cannot claim to be equivalent to prescription medications or " +
      "use prescription drug terminology.",
    keywords: [
      "prescription strength",
      "prescription grade",
      "rx strength",
      "doctor prescribed",
      "hospital grade",
      "prescription alternative",
      "as effective as prescription",
    ],
    enabled: true,
  },

  // ── Unapproved Active Ingredients (CRITICAL) ────────────────────
  {
    id: "otc-unapproved-001",
    category: "otc_drug",
    ruleType: "absence",
    severity: "critical",
    name: "Potentially Unapproved Active Ingredient",
    description:
      "This product may reference an active ingredient that is not included in any " +
      "OTC drug monograph. Only FDA-approved active ingredients may be used in OTC drugs.",
    keywords: [
      "colloidal silver",
      "mms",
      "miracle mineral",
      "chlorine dioxide",
      "black salve",
      "dmso",
    ],
    enabled: true,
  },

  // ── Children's Dosage (WARNING) ──────────────────────────────────
  {
    id: "otc-children-001",
    category: "otc_drug",
    ruleType: "pattern",
    severity: "warning",
    name: "Children's Product May Need Age-Specific Warnings",
    description:
      "Products marketed for children require age-specific dosage instructions and " +
      "appropriate warnings. Children under certain ages may need doctor consultation.",
    pattern: "(?:children|kids|child|pediatric|infant|baby|toddler)",
    enabled: true,
  },
];
