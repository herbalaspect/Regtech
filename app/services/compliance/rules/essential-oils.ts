import type { ComplianceRule } from "~/lib/types";
import { ESSENTIAL_OIL_THERAPEUTIC_CLAIMS } from "~/lib/constants";

export const essentialOilRules: ComplianceRule[] = [
  // ── Therapeutic Claims (CRITICAL) ────────────────────────────────
  {
    id: "eo-therapeutic-001",
    category: "essential_oil",
    ruleType: "absence",
    severity: "critical",
    name: "Therapeutic/Drug Claims on Essential Oil",
    description:
      "Essential oils marketed as cosmetics or aromatherapy products cannot make " +
      "therapeutic claims (treating disease, relieving pain, curing conditions). " +
      "Such claims reclassify the product as a drug requiring FDA approval.",
    keywords: ESSENTIAL_OIL_THERAPEUTIC_CLAIMS,
    enabled: true,
  },

  // ── Drug Claims (CRITICAL) ───────────────────────────────────────
  {
    id: "eo-drug-001",
    category: "essential_oil",
    ruleType: "absence",
    severity: "critical",
    name: "Disease Treatment Claims",
    description:
      "Essential oils cannot claim to treat, cure, or prevent specific diseases. " +
      "This is a violation of FDA regulations for unapproved drugs.",
    keywords: [
      "treats diabetes",
      "treats cancer",
      "cures depression",
      "prevents disease",
      "kills bacteria",
      "kills viruses",
      "antiviral",
      "treats adhd",
      "treats autism",
      "treats alzheimer",
      "blood pressure medication",
    ],
    enabled: true,
  },

  // ── Safety Warnings (WARNING) ────────────────────────────────────
  {
    id: "eo-safety-001",
    category: "essential_oil",
    ruleType: "presence",
    severity: "warning",
    name: "Missing Safety Warnings",
    description:
      "Essential oil products should include safety warnings about proper dilution, " +
      "skin sensitivity, and keeping away from children and pets.",
    keywords: [
      "dilute",
      "dilution",
      "patch test",
      "skin sensitivity",
      "keep out of reach",
      "do not ingest",
      "not for internal use",
      "external use only",
      "avoid contact with eyes",
      "discontinue use if irritation",
    ],
    enabled: true,
  },

  // ── Internal Use Claims (CRITICAL) ───────────────────────────────
  {
    id: "eo-internal-001",
    category: "essential_oil",
    ruleType: "absence",
    severity: "critical",
    name: "Internal Use/Ingestion Promoted",
    description:
      "Promoting essential oils for internal use or ingestion is dangerous and may " +
      "constitute selling an unapproved drug. Most essential oils are not safe for consumption.",
    keywords: [
      "add to water",
      "add to drink",
      "ingest",
      "take internally",
      "internal use",
      "food grade essential oil",
      "cooking with essential oil",
      "add to food",
      "drops under tongue",
      "sublingual",
    ],
    enabled: true,
  },

  // ── Therapeutic Grade Claims (WARNING) ───────────────────────────
  {
    id: "eo-grade-001",
    category: "essential_oil",
    ruleType: "absence",
    severity: "warning",
    name: "Unregulated Quality Claims",
    description:
      "Terms like 'therapeutic grade' or 'clinical grade' are not regulated by any " +
      "governing body. There is no official grading system for essential oils, " +
      "and these terms may be misleading.",
    keywords: [
      "therapeutic grade",
      "clinical grade",
      "medical grade",
      "pharmaceutical grade",
      "certified pure therapeutic grade",
      "cptg",
    ],
    enabled: true,
  },

  // ── Ingredient/Purity Disclosure (INFO) ──────────────────────────
  {
    id: "eo-purity-001",
    category: "essential_oil",
    ruleType: "presence",
    severity: "info",
    name: "Consider Adding Purity/Source Information",
    description:
      "Consumers expect transparency about essential oil purity, sourcing, and " +
      "extraction method. Consider including this information.",
    keywords: [
      "100% pure",
      "pure essential oil",
      "steam distilled",
      "cold pressed",
      "co2 extracted",
      "no additives",
      "no fillers",
      "undiluted",
      "origin:",
      "sourced from",
    ],
    enabled: true,
  },

  // ── Pregnancy/Children Warnings (WARNING) ────────────────────────
  {
    id: "eo-vulnerable-001",
    category: "essential_oil",
    ruleType: "presence",
    severity: "warning",
    name: "Missing Vulnerable Population Warnings",
    description:
      "Essential oil products should include warnings about use during pregnancy, " +
      "breastfeeding, and around young children or pets, as many oils are harmful to these groups.",
    keywords: [
      "pregnant",
      "pregnancy",
      "nursing",
      "breastfeeding",
      "children under",
      "not for children",
      "consult doctor",
      "consult physician",
      "pets",
      "cats",
      "dogs",
    ],
    enabled: true,
  },
];
