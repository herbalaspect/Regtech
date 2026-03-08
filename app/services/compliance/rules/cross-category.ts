import type { ComplianceRule } from "~/lib/types";

export const crossCategoryRules: ComplianceRule[] = [
  // ── California Prop 65 (WARNING) ─────────────────────────────────
  {
    id: "cross-prop65-001",
    category: "cross_category",
    ruleType: "presence",
    severity: "warning",
    name: "Consider California Proposition 65 Warning",
    description:
      "Products sold in California may require a Prop 65 warning if they contain " +
      "chemicals known to the state to cause cancer or reproductive harm. " +
      "Businesses with 10+ employees must comply.",
    keywords: [
      "proposition 65",
      "prop 65",
      "known to the state of california",
      "california warning",
      "cancer and reproductive harm",
      "p65",
    ],
    enabled: true,
  },

  // ── FTC Unsubstantiated Claims (WARNING) ─────────────────────────
  {
    id: "cross-ftc-001",
    category: "cross_category",
    ruleType: "absence",
    severity: "warning",
    name: "Potentially Unsubstantiated Health Claims",
    description:
      "FTC requires that all health and efficacy claims be substantiated by competent " +
      "and reliable scientific evidence BEFORE making the claim.",
    keywords: [
      "scientifically proven",
      "clinically proven",
      "doctor recommended",
      "studies show",
      "research proves",
      "guaranteed results",
      "100% effective",
      "miracle",
      "breakthrough",
      "revolutionary formula",
      "secret formula",
      "ancient remedy",
      "cure-all",
    ],
    enabled: true,
  },

  // ── Money-Back Guarantee Claims (INFO) ───────────────────────────
  {
    id: "cross-ftc-002",
    category: "cross_category",
    ruleType: "pattern",
    severity: "info",
    name: "Money-Back Guarantee May Need Qualification",
    description:
      "Money-back guarantees must be genuine and clearly state any conditions or limitations. " +
      "The FTC requires that guarantee terms be clearly disclosed.",
    pattern: "(?:money[- ]back|satisfaction) (?:guarant|100%)",
    enabled: true,
  },

  // ── Comparative Claims (WARNING) ─────────────────────────────────
  {
    id: "cross-ftc-003",
    category: "cross_category",
    ruleType: "absence",
    severity: "warning",
    name: "Comparative Claims Require Substantiation",
    description:
      "Claims comparing your product to competitors must be truthful, not misleading, " +
      "and substantiated. Unqualified superiority claims are risky.",
    keywords: [
      "#1 rated",
      "number one",
      "best in class",
      "better than",
      "more effective than",
      "outperforms",
      "superior to",
      "nothing else compares",
      "strongest on the market",
      "most powerful",
      "industry leading",
    ],
    enabled: true,
  },

  // ── Missing Country of Origin (INFO) ─────────────────────────────
  {
    id: "cross-origin-001",
    category: "cross_category",
    ruleType: "presence",
    severity: "info",
    name: "Consider Adding Country of Origin",
    description:
      "Many regulated products benefit from disclosing country of origin for " +
      "consumer transparency and customs compliance.",
    keywords: [
      "made in",
      "manufactured in",
      "produced in",
      "country of origin",
      "imported from",
      "product of",
    ],
    enabled: true,
  },

  // ── "FDA Approved" Misuse (CRITICAL) ─────────────────────────────
  {
    id: "cross-fda-001",
    category: "cross_category",
    ruleType: "absence",
    severity: "critical",
    name: "Misleading FDA Approval Claims",
    description:
      "Only specific drugs and medical devices are FDA approved. Supplements, cosmetics, " +
      "and foods are NOT FDA approved. Claiming FDA approval when it doesn't exist is illegal.",
    keywords: [
      "fda approved",
      "fda-approved",
      "approved by the fda",
      "fda certified",
      "fda endorsed",
      "fda recommended",
    ],
    enabled: true,
  },

  // ── GMP Claims (INFO) ───────────────────────────────────────────
  {
    id: "cross-gmp-001",
    category: "cross_category",
    ruleType: "pattern",
    severity: "info",
    name: "GMP Certification Claim — Verify Accuracy",
    description:
      "Claims of GMP (Good Manufacturing Practices) certification should be verifiable. " +
      "Ensure your manufacturer actually holds current GMP certification.",
    pattern: "(?:gmp|good manufacturing practice).*(?:certified|compliant|facility)",
    enabled: true,
  },
];
