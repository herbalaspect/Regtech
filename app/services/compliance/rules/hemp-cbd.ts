import type { ComplianceRule } from "~/lib/types";
import { THERAPEUTIC_CLAIM_KEYWORDS } from "~/lib/constants";

export const hempCbdRules: ComplianceRule[] = [
  // ── Therapeutic Claims (CRITICAL) ────────────────────────────────
  {
    id: "hemp-claims-001",
    category: "hemp_cbd",
    ruleType: "absence",
    severity: "critical",
    name: "Prohibited Therapeutic Claims",
    description:
      "Hemp and CBD products cannot make therapeutic claims such as pain relief, " +
      "anxiety reduction, or sleep improvement. These constitute drug claims under FDA regulations.",
    keywords: THERAPEUTIC_CLAIM_KEYWORDS,
    enabled: true,
  },

  // ── Drug Claims (CRITICAL) ───────────────────────────────────────
  {
    id: "hemp-drug-001",
    category: "hemp_cbd",
    ruleType: "absence",
    severity: "critical",
    name: "Drug/Disease Claims on CBD Product",
    description:
      "CBD products cannot claim to treat, cure, diagnose, or prevent any disease.",
    keywords: [
      "cures",
      "treats",
      "prevents disease",
      "diagnoses",
      "anti-cancer",
      "anti-tumor",
      "treats epilepsy",
      "treats seizures",
      "treats parkinson",
      "treats alzheimer",
      "treats diabetes",
      "treats arthritis",
    ],
    enabled: true,
  },

  // ── THC Content Disclosure (CRITICAL) ────────────────────────────
  {
    id: "hemp-thc-001",
    category: "hemp_cbd",
    ruleType: "presence",
    severity: "critical",
    name: "Missing THC Content Disclosure",
    description:
      "Hemp-derived products must disclose THC content and confirm compliance with " +
      "the federal limit of <0.3% THC.",
    keywords: [
      "thc",
      "0.3%",
      "less than 0.3",
      "thc free",
      "thc-free",
      "non-detect",
      "nd thc",
      "contains no thc",
      "zero thc",
    ],
    enabled: true,
  },

  // ── Certificate of Analysis (WARNING) ────────────────────────────
  {
    id: "hemp-coa-001",
    category: "hemp_cbd",
    ruleType: "presence",
    severity: "warning",
    name: "No Certificate of Analysis (CoA) Reference",
    description:
      "Hemp/CBD products should reference third-party lab testing and Certificate of Analysis " +
      "to verify potency, purity, and THC compliance.",
    keywords: [
      "certificate of analysis",
      "coa",
      "lab tested",
      "third-party tested",
      "third party tested",
      "lab report",
      "test results",
      "independently tested",
    ],
    enabled: true,
  },

  // ── Ingestible CBD Warning (CRITICAL) ────────────────────────────
  {
    id: "hemp-ingest-001",
    category: "hemp_cbd",
    ruleType: "absence",
    severity: "critical",
    name: "CBD Marketed as Food/Dietary Supplement",
    description:
      "FDA has determined that CBD cannot be marketed as a dietary supplement or added to food. " +
      "Ingestible CBD products (gummies, capsules, tinctures) face heightened regulatory risk.",
    keywords: [
      "cbd supplement",
      "cbd dietary supplement",
      "cbd food",
      "cbd beverage",
      "cbd drink",
      "cbd edible",
    ],
    enabled: true,
  },

  // ── DSHEA Disclaimer on CBD (WARNING) ────────────────────────────
  {
    id: "hemp-dshea-001",
    category: "hemp_cbd",
    ruleType: "absence",
    severity: "warning",
    name: "FDA Disclaimer Used on CBD Product",
    description:
      "Using the DSHEA disclaimer on CBD products may be misleading since FDA has not " +
      "recognized CBD as a lawful dietary supplement ingredient.",
    keywords: [
      "not been evaluated by the food and drug administration",
      "not intended to diagnose, treat, cure",
    ],
    enabled: true,
  },

  // ── Dosage/Medical Directions (WARNING) ──────────────────────────
  {
    id: "hemp-dosage-001",
    category: "hemp_cbd",
    ruleType: "absence",
    severity: "warning",
    name: "Medical-Style Dosage Instructions",
    description:
      "Providing specific medical dosage instructions implies the product is a drug. " +
      "Serving suggestions should avoid medical language.",
    keywords: [
      "take 2 capsules",
      "administer",
      "dosage",
      "prescribed",
      "as directed by physician",
      "therapeutic dose",
      "clinical dose",
    ],
    enabled: true,
  },

  // ── State Legality Note (INFO) ───────────────────────────────────
  {
    id: "hemp-state-001",
    category: "hemp_cbd",
    ruleType: "presence",
    severity: "info",
    name: "Consider Adding State Shipping Restrictions",
    description:
      "CBD/hemp legality varies by state. Consider adding a note about shipping restrictions " +
      "or state-specific availability.",
    keywords: [
      "check your state",
      "state law",
      "shipping restrictions",
      "not available in all states",
      "legal in your state",
      "state regulations",
    ],
    enabled: true,
  },
];
