import type {
  StateRegulationData,
  CoaParsedData,
  StateComplianceResult,
  StateComplianceIssue,
  ContaminantResults,
} from "~/lib/state-types";
import type { ProductData } from "~/lib/types";

// ── Regex patterns for extracting THC values from product text ──────

const THC_PERCENT_PATTERN =
  /(\d+\.?\d*)\s*%\s*(thc|delta.?9|delta.?8|total\s*thc)/gi;

const THC_MG_PATTERN =
  /(\d+\.?\d*)\s*mg\s*(thc|delta.?9|delta.?8)/gi;

// ── Health / therapeutic claim patterns ──────────────────────────────

const HEALTH_CLAIM_PATTERNS = [
  /\b(cure|cures|treat|treats|prevent|prevents|diagnose|diagnoses)\b/i,
  /\b(anti.?inflammatory|anti.?cancer|anti.?tumor|anti.?anxiety)\b/i,
  /\b(reduces?\s+(pain|anxiety|inflammation|seizures|nausea))\b/i,
  /\b(helps?\s+(with\s+)?(cancer|diabetes|epilepsy|alzheimer|parkinson))\b/i,
  /\b(clinically\s+proven|fda\s+approved|doctor\s+recommended)\b/i,
  /\b(medical\s+grade|pharmaceutical\s+grade|prescription\s+strength)\b/i,
];

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Build a single searchable text corpus from a product's fields.
 */
function buildProductText(product: ProductData): string {
  return [
    product.title,
    product.description,
    product.bodyHtml,
    product.tags.join(" "),
    Object.values(product.metafields).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Extract all THC percentage claims from product text.
 */
function extractThcPercentClaims(
  text: string,
): { value: number; cannabinoid: string; raw: string }[] {
  const results: { value: number; cannabinoid: string; raw: string }[] = [];
  const regex = new RegExp(THC_PERCENT_PATTERN.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({
      value: parseFloat(match[1]),
      cannabinoid: match[2].toLowerCase().replace(/[\s-]/g, ""),
      raw: match[0],
    });
  }
  return results;
}

/**
 * Extract all THC mg claims from product text.
 */
function extractThcMgClaims(
  text: string,
): { value: number; cannabinoid: string; raw: string }[] {
  const results: { value: number; cannabinoid: string; raw: string }[] = [];
  const regex = new RegExp(THC_MG_PATTERN.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({
      value: parseFloat(match[1]),
      cannabinoid: match[2].toLowerCase().replace(/[\s-]/g, ""),
      raw: match[0],
    });
  }
  return results;
}

/**
 * Normalize a cannabinoid name for consistent comparison.
 * e.g. "Delta-8 THC" -> "delta8thc", "delta 9" -> "delta9"
 */
function normalizeCannabinoidName(name: string): string {
  return name.toLowerCase().replace(/[\s\-_.]/g, "");
}

/**
 * Map a cannabinoid profile key to a readable name.
 */
function cannabinoidKeyToName(key: string): string {
  const map: Record<string, string> = {
    delta9_thc: "Delta-9 THC",
    delta8_thc: "Delta-8 THC",
    thca: "THCA",
    total_thc: "Total THC",
    cbd: "CBD",
    cbda: "CBDA",
    total_cbd: "Total CBD",
    cbg: "CBG",
    cbn: "CBN",
    cbc: "CBC",
    thcv: "THCV",
    cbdv: "CBDV",
  };
  return map[key] ?? key.toUpperCase();
}

// ── 1. Product-level state compliance ───────────────────────────────

/**
 * Check a product's text content against a single state's regulations.
 */
export function checkProductStateCompliance(
  product: ProductData,
  stateCode: string,
  regulation: StateRegulationData,
): StateComplianceResult {
  const issues: StateComplianceIssue[] = [];
  const text = buildProductText(product);
  const code = stateCode.toUpperCase();

  // ── THC content claims vs. state limits ─────────────────────────
  if (regulation.deltaThcLimitPct !== null) {
    const percentClaims = extractThcPercentClaims(text);
    for (const claim of percentClaims) {
      if (claim.value > regulation.deltaThcLimitPct) {
        issues.push({
          severity: "critical",
          ruleId: `state-${code}-thc-limit`,
          title: "THC percentage exceeds state limit",
          description: `Product text claims "${claim.raw}" but ${regulation.stateName} limits delta-9 THC to ${regulation.deltaThcLimitPct}%.`,
          affectedValue: `${claim.value}%`,
          stateRequirement: `Max ${regulation.deltaThcLimitPct}% delta-9 THC`,
          suggestion: `Remove or correct the THC percentage claim to comply with ${regulation.stateName}'s ${regulation.deltaThcLimitPct}% limit.`,
        });
      }
    }
  }

  if (regulation.totalThcLimitPct !== null) {
    const percentClaims = extractThcPercentClaims(text);
    for (const claim of percentClaims) {
      if (
        claim.cannabinoid.includes("totalthc") &&
        claim.value > regulation.totalThcLimitPct
      ) {
        issues.push({
          severity: "critical",
          ruleId: `state-${code}-total-thc-limit`,
          title: "Total THC percentage exceeds state limit",
          description: `Product text claims "${claim.raw}" but ${regulation.stateName} limits total THC to ${regulation.totalThcLimitPct}%.`,
          affectedValue: `${claim.value}%`,
          stateRequirement: `Max ${regulation.totalThcLimitPct}% total THC`,
          suggestion: `Ensure total THC claims do not exceed ${regulation.stateName}'s ${regulation.totalThcLimitPct}% limit.`,
        });
      }
    }
  }

  // ── THC mg claims vs. edible limits ─────────────────────────────
  if (
    regulation.thcMgPerServing !== null ||
    regulation.thcMgPerPackage !== null
  ) {
    const mgClaims = extractThcMgClaims(text);
    for (const claim of mgClaims) {
      if (
        regulation.thcMgPerServing !== null &&
        claim.value > regulation.thcMgPerServing
      ) {
        issues.push({
          severity: "critical",
          ruleId: `state-${code}-thc-mg-serving`,
          title: "THC mg claim may exceed per-serving limit",
          description: `Product text claims "${claim.raw}" which may exceed ${regulation.stateName}'s per-serving limit of ${regulation.thcMgPerServing}mg THC.`,
          affectedValue: `${claim.value}mg`,
          stateRequirement: `Max ${regulation.thcMgPerServing}mg THC per serving`,
          suggestion: `Verify the mg value refers to per-package, not per-serving. ${regulation.stateName} limits servings to ${regulation.thcMgPerServing}mg THC.`,
        });
      }
      if (
        regulation.thcMgPerPackage !== null &&
        claim.value > regulation.thcMgPerPackage
      ) {
        issues.push({
          severity: "critical",
          ruleId: `state-${code}-thc-mg-package`,
          title: "THC mg claim exceeds per-package limit",
          description: `Product text claims "${claim.raw}" which exceeds ${regulation.stateName}'s per-package limit of ${regulation.thcMgPerPackage}mg THC.`,
          affectedValue: `${claim.value}mg`,
          stateRequirement: `Max ${regulation.thcMgPerPackage}mg THC per package`,
          suggestion: `Reduce THC content per package to comply with ${regulation.stateName}'s ${regulation.thcMgPerPackage}mg limit.`,
        });
      }
    }
  }

  // ── Banned cannabinoid mentions ─────────────────────────────────
  for (const banned of regulation.bannedCannabinoids) {
    const normalizedBanned = normalizeCannabinoidName(banned);
    // Build flexible search patterns for the banned cannabinoid
    const searchTerms = [banned.toLowerCase()];
    // Add common variants: "delta-8" -> also check "delta 8", "delta8"
    if (banned.toLowerCase().includes("delta")) {
      searchTerms.push(
        banned.toLowerCase().replace(/[\s-]/g, ""),
        banned.toLowerCase().replace(/[\s-]/g, " "),
        banned.toLowerCase().replace(/[\s-]/g, "-"),
      );
    }

    const found = searchTerms.some((term) => text.includes(term));
    if (found) {
      issues.push({
        severity: "critical",
        ruleId: `state-${code}-banned-cannabinoid-${normalizedBanned}`,
        title: `Banned cannabinoid mentioned: ${banned}`,
        description: `Product references "${banned}" which is banned in ${regulation.stateName}.`,
        affectedValue: banned,
        stateRequirement: `${banned} is prohibited in ${regulation.stateName}`,
        suggestion: `Remove all references to ${banned} from product listing for ${regulation.stateName} compliance.`,
      });
    }
  }

  // ── Labeling requirements ───────────────────────────────────────
  for (const requirement of regulation.labelingRequirements) {
    const reqLower = requirement.toLowerCase();
    // Check whether the product text mentions this labeling element
    if (!text.includes(reqLower)) {
      issues.push({
        severity: "warning",
        ruleId: `state-${code}-labeling-${reqLower.replace(/\s+/g, "-")}`,
        title: `Missing labeling reference: ${requirement}`,
        description: `${regulation.stateName} requires "${requirement}" on product labeling, but no reference was found in the product listing.`,
        stateRequirement: `Labeling must include: ${requirement}`,
        suggestion: `Add "${requirement}" information to product description or ensure physical label includes it.`,
      });
    }
  }

  // ── Advertising violations ──────────────────────────────────────
  for (const pattern of HEALTH_CLAIM_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      issues.push({
        severity: "critical",
        ruleId: `state-${code}-advertising-health-claim`,
        title: "Potential health/therapeutic claim detected",
        description: `Product text contains "${match[0]}" which may violate ${regulation.stateName}'s advertising rules prohibiting health or therapeutic claims.`,
        affectedValue: match[0],
        stateRequirement: "No health or therapeutic claims permitted",
        suggestion: `Remove or rephrase "${match[0]}" to avoid making health claims. Use wellness-oriented language instead.`,
      });
      // Only report the first health claim match to avoid excessive noise
      break;
    }
  }

  // Check state-specific advertising rules
  for (const rule of regulation.advertisingRules) {
    const ruleLower = rule.toLowerCase();
    // If the advertising rule is a prohibition keyword, scan for it
    if (text.includes(ruleLower)) {
      issues.push({
        severity: "warning",
        ruleId: `state-${code}-advertising-rule`,
        title: "Potential advertising rule violation",
        description: `Product text may conflict with ${regulation.stateName} advertising rule: "${rule}".`,
        stateRequirement: rule,
        suggestion: `Review product text against ${regulation.stateName}'s advertising regulations and adjust language accordingly.`,
      });
    }
  }

  // ── Age restriction compliance ──────────────────────────────────
  if (regulation.minAge >= 21) {
    const ageTerms = [
      "age verification",
      "21+",
      "must be 21",
      "21 and over",
      "21 or older",
      "age 21",
      "twenty-one",
    ];
    const hasAgeReference = ageTerms.some((term) => text.includes(term));
    if (!hasAgeReference) {
      issues.push({
        severity: "warning",
        ruleId: `state-${code}-age-restriction`,
        title: "Missing age verification reference",
        description: `${regulation.stateName} requires purchasers to be at least ${regulation.minAge}. No age verification language found in product listing.`,
        stateRequirement: `Minimum age: ${regulation.minAge}`,
        suggestion: `Add age verification notice (e.g., "Must be ${regulation.minAge}+") to the product listing.`,
      });
    }
  } else if (regulation.minAge >= 18) {
    const ageTerms = [
      "age verification",
      "18+",
      "must be 18",
      "18 and over",
      "18 or older",
      "age 18",
      "eighteen",
    ];
    const hasAgeReference = ageTerms.some((term) => text.includes(term));
    if (!hasAgeReference) {
      issues.push({
        severity: "info",
        ruleId: `state-${code}-age-restriction`,
        title: "Missing age verification reference",
        description: `${regulation.stateName} requires purchasers to be at least ${regulation.minAge}. No age verification language found in product listing.`,
        stateRequirement: `Minimum age: ${regulation.minAge}`,
        suggestion: `Consider adding age verification notice (e.g., "Must be ${regulation.minAge}+") to the product listing.`,
      });
    }
  }

  // ── Shipping compliance ─────────────────────────────────────────
  if (!regulation.allowsInboundShipping) {
    issues.push({
      severity: "critical",
      ruleId: `state-${code}-shipping-prohibited`,
      title: "Inbound shipping not allowed",
      description: `${regulation.stateName} does not allow inbound shipping of cannabis/hemp products.${regulation.shippingNotes ? ` Note: ${regulation.shippingNotes}` : ""}`,
      stateRequirement: "Inbound shipping prohibited",
      suggestion: `Do not ship this product to ${regulation.stateName}. Consider removing ${regulation.stateName} from your shipping destinations.`,
    });
  }

  // ── License requirement notice ──────────────────────────────────
  if (regulation.requiresLicense) {
    const licenseTerms = [
      "licensed",
      "license",
      "licence",
      "permit",
      "authorized",
      "certification",
      "certified",
    ];
    const hasLicenseRef = licenseTerms.some((term) => text.includes(term));
    if (!hasLicenseRef) {
      issues.push({
        severity: "warning",
        ruleId: `state-${code}-license-required`,
        title: "License requirement not indicated",
        description: `${regulation.stateName} requires a license to sell cannabis/hemp products (types: ${regulation.licenseTypes.join(", ")}). No license reference found in product listing.`,
        stateRequirement: `License required: ${regulation.licenseTypes.join(", ")}`,
        suggestion: `Include license or authorization information in the product listing.${regulation.licenseUrl ? ` More info: ${regulation.licenseUrl}` : ""}`,
      });
    }
  }

  // ── Cannabis legality check ─────────────────────────────────────
  if (!regulation.cannabisLegal && !regulation.hempLegal) {
    issues.push({
      severity: "critical",
      ruleId: `state-${code}-not-legal`,
      title: "Cannabis/hemp products not legal in this state",
      description: `Neither cannabis nor hemp products are currently legal in ${regulation.stateName}.`,
      stateRequirement: "Cannabis and hemp products are prohibited",
      suggestion: `Do not sell or ship cannabis/hemp products to ${regulation.stateName}.`,
    });
  } else if (regulation.medicalOnly) {
    issues.push({
      severity: "warning",
      ruleId: `state-${code}-medical-only`,
      title: "Medical-only state",
      description: `${regulation.stateName} only permits medical cannabis. Verify that product sales comply with the state's medical program requirements.`,
      stateRequirement: "Medical use only",
      suggestion: `Ensure this product is only sold to verified medical patients in ${regulation.stateName}.`,
    });
  }

  const compliant = !issues.some((i) => i.severity === "critical");

  return {
    stateCode: code,
    stateName: regulation.stateName,
    compliant,
    issues,
  };
}

// ── 2. COA-level state compliance ───────────────────────────────────

/**
 * Check COA lab results against a single state's limits and requirements.
 */
export function checkCoaStateCompliance(
  coaData: CoaParsedData,
  stateCode: string,
  regulation: StateRegulationData,
): StateComplianceResult {
  const issues: StateComplianceIssue[] = [];
  const code = stateCode.toUpperCase();
  const cannabinoids = coaData.cannabinoidResults;

  // ── Delta-9 THC limit ───────────────────────────────────────────
  if (
    regulation.deltaThcLimitPct !== null &&
    cannabinoids.delta9_thc !== null
  ) {
    if (cannabinoids.delta9_thc > regulation.deltaThcLimitPct) {
      issues.push({
        severity: "critical",
        ruleId: `state-${code}-coa-delta9-thc-limit`,
        title: "Delta-9 THC exceeds state limit",
        description: `COA shows delta-9 THC at ${cannabinoids.delta9_thc}% which exceeds ${regulation.stateName}'s limit of ${regulation.deltaThcLimitPct}%.`,
        affectedValue: `${cannabinoids.delta9_thc}%`,
        stateRequirement: `Max ${regulation.deltaThcLimitPct}% delta-9 THC`,
        suggestion: `Product cannot be sold in ${regulation.stateName} with current THC levels. Reformulation or a different product batch is needed.`,
      });
    }
  }

  // ── Total THC limit ─────────────────────────────────────────────
  if (regulation.totalThcLimitPct !== null) {
    const totalThc = coaData.totalThcPct ?? cannabinoids.total_thc;
    if (totalThc !== null && totalThc > regulation.totalThcLimitPct) {
      issues.push({
        severity: "critical",
        ruleId: `state-${code}-coa-total-thc-limit`,
        title: "Total THC exceeds state limit",
        description: `COA shows total THC at ${totalThc}% which exceeds ${regulation.stateName}'s limit of ${regulation.totalThcLimitPct}%.`,
        affectedValue: `${totalThc}%`,
        stateRequirement: `Max ${regulation.totalThcLimitPct}% total THC`,
        suggestion: `Product cannot be sold in ${regulation.stateName} with current total THC levels.`,
      });
    }
  }

  // ── Edible THC limits (mg per serving / per package) ────────────
  if (regulation.thcMgPerServing !== null) {
    // Check if COA has per-serving data in metafields or cannabinoid profile
    // We approximate by checking if any THC mg value is referenced
    const delta9Pct = cannabinoids.delta9_thc;
    if (delta9Pct !== null) {
      issues.push({
        severity: "info",
        ruleId: `state-${code}-coa-edible-serving-check`,
        title: "Edible THC per-serving verification needed",
        description: `${regulation.stateName} limits edible products to ${regulation.thcMgPerServing}mg THC per serving. COA shows ${delta9Pct}% delta-9 THC. Verify per-serving mg based on product weight.`,
        stateRequirement: `Max ${regulation.thcMgPerServing}mg THC per serving`,
        suggestion: `Calculate per-serving THC mg from COA percentage and product serving size to ensure compliance.`,
      });
    }
  }

  if (regulation.thcMgPerPackage !== null) {
    const delta9Pct = cannabinoids.delta9_thc;
    if (delta9Pct !== null) {
      issues.push({
        severity: "info",
        ruleId: `state-${code}-coa-edible-package-check`,
        title: "Edible THC per-package verification needed",
        description: `${regulation.stateName} limits edible products to ${regulation.thcMgPerPackage}mg THC per package. COA shows ${delta9Pct}% delta-9 THC. Verify per-package mg based on total product weight.`,
        stateRequirement: `Max ${regulation.thcMgPerPackage}mg THC per package`,
        suggestion: `Calculate total package THC mg from COA percentage and total product weight to ensure compliance.`,
      });
    }
  }

  // ── Banned cannabinoids ─────────────────────────────────────────
  for (const banned of regulation.bannedCannabinoids) {
    const normalizedBanned = normalizeCannabinoidName(banned);

    // Map banned cannabinoid name to COA profile keys
    const bannedEntries = Object.entries(cannabinoids) as [string, number | null][];
    for (const [key, value] of bannedEntries) {
      if (value === null || value <= 0) continue;

      const normalizedKey = normalizeCannabinoidName(
        cannabinoidKeyToName(key),
      );
      // Also normalize the raw key
      const normalizedRawKey = normalizeCannabinoidName(key);

      if (
        normalizedKey.includes(normalizedBanned) ||
        normalizedBanned.includes(normalizedKey) ||
        normalizedRawKey.includes(normalizedBanned) ||
        normalizedBanned.includes(normalizedRawKey)
      ) {
        issues.push({
          severity: "critical",
          ruleId: `state-${code}-coa-banned-cannabinoid-${normalizedBanned}`,
          title: `Banned cannabinoid detected: ${banned}`,
          description: `COA shows ${cannabinoidKeyToName(key)} at ${value}% which is banned in ${regulation.stateName}.`,
          affectedValue: `${value}%`,
          stateRequirement: `${banned} is prohibited in ${regulation.stateName}`,
          suggestion: `Product containing ${banned} cannot be sold in ${regulation.stateName}.`,
        });
      }
    }
  }

  // ── Restricted cannabinoids ─────────────────────────────────────
  for (const restricted of regulation.restrictedCannabinoids) {
    const normalizedRestricted = normalizeCannabinoidName(restricted.name);

    const restrictedEntries = Object.entries(cannabinoids) as [string, number | null][];
    for (const [key, value] of restrictedEntries) {
      if (value === null || value <= 0) continue;

      const normalizedKey = normalizeCannabinoidName(
        cannabinoidKeyToName(key),
      );
      const normalizedRawKey = normalizeCannabinoidName(key);

      if (
        normalizedKey.includes(normalizedRestricted) ||
        normalizedRestricted.includes(normalizedKey) ||
        normalizedRawKey.includes(normalizedRestricted) ||
        normalizedRestricted.includes(normalizedRawKey)
      ) {
        issues.push({
          severity: "warning",
          ruleId: `state-${code}-coa-restricted-cannabinoid-${normalizedRestricted}`,
          title: `Restricted cannabinoid detected: ${restricted.name}`,
          description: `COA shows ${cannabinoidKeyToName(key)} at ${value}%. ${regulation.stateName} restriction: ${restricted.condition}.`,
          affectedValue: `${value}%`,
          stateRequirement: restricted.condition,
          suggestion: `Verify that ${restricted.name} levels comply with the condition: "${restricted.condition}".`,
        });
      }
    }
  }

  // ── Contaminant testing requirements ────────────────────────────
  const contaminantTests = coaData.contaminantResults;
  const requiredTests: (keyof ContaminantResults)[] = [
    "pesticides",
    "heavy_metals",
    "microbials",
    "mycotoxins",
    "residual_solvents",
  ];

  for (const testName of requiredTests) {
    const result = contaminantTests[testName];
    if (result === "not_tested") {
      issues.push({
        severity: "warning",
        ruleId: `state-${code}-coa-contaminant-not-tested-${testName}`,
        title: `Required test not performed: ${testName.replace(/_/g, " ")}`,
        description: `COA does not include results for ${testName.replace(/_/g, " ")} testing. Most states require this for compliance.`,
        stateRequirement: `${testName.replace(/_/g, " ")} testing required`,
        suggestion: `Request a complete COA from the lab that includes ${testName.replace(/_/g, " ")} testing.`,
      });
    } else if (result === "fail") {
      issues.push({
        severity: "critical",
        ruleId: `state-${code}-coa-contaminant-fail-${testName}`,
        title: `Contaminant test failed: ${testName.replace(/_/g, " ")}`,
        description: `COA shows a FAIL result for ${testName.replace(/_/g, " ")} testing. Product cannot be sold in ${regulation.stateName}.`,
        affectedValue: "FAIL",
        stateRequirement: `${testName.replace(/_/g, " ")} must pass`,
        suggestion: `Product must pass ${testName.replace(/_/g, " ")} testing before sale in ${regulation.stateName}. Retest or reformulate.`,
      });
    }
  }

  const compliant = !issues.some((i) => i.severity === "critical");

  return {
    stateCode: code,
    stateName: regulation.stateName,
    compliant,
    issues,
  };
}

// ── 3. Multi-state product compliance ───────────────────────────────

/**
 * Run product compliance checks against multiple states at once.
 */
export function checkMultiStateCompliance(
  product: ProductData,
  targetStates: string[],
  regulations: Map<string, StateRegulationData>,
): StateComplianceResult[] {
  const results: StateComplianceResult[] = [];

  for (const stateCode of targetStates) {
    const code = stateCode.toUpperCase();
    const regulation = regulations.get(code);
    if (!regulation) {
      results.push({
        stateCode: code,
        stateName: code,
        compliant: false,
        issues: [
          {
            severity: "warning",
            ruleId: `state-${code}-no-regulation-data`,
            title: "No regulation data available",
            description: `No regulation data found for state code "${code}". Compliance cannot be determined.`,
            suggestion: "Ensure state regulation data is loaded for this state.",
          },
        ],
      });
      continue;
    }

    results.push(checkProductStateCompliance(product, code, regulation));
  }

  return results;
}

// ── 4. Multi-state COA compliance ───────────────────────────────────

/**
 * Run COA compliance checks against multiple states at once.
 */
export function checkCoaMultiStateCompliance(
  coaData: CoaParsedData,
  targetStates: string[],
  regulations: Map<string, StateRegulationData>,
): StateComplianceResult[] {
  const results: StateComplianceResult[] = [];

  for (const stateCode of targetStates) {
    const code = stateCode.toUpperCase();
    const regulation = regulations.get(code);
    if (!regulation) {
      results.push({
        stateCode: code,
        stateName: code,
        compliant: false,
        issues: [
          {
            severity: "warning",
            ruleId: `state-${code}-no-regulation-data`,
            title: "No regulation data available",
            description: `No regulation data found for state code "${code}". Compliance cannot be determined.`,
            suggestion: "Ensure state regulation data is loaded for this state.",
          },
        ],
      });
      continue;
    }

    results.push(checkCoaStateCompliance(coaData, code, regulation));
  }

  return results;
}

// ── 5. Shippable states check ───────────────────────────────────────

/**
 * Returns a list of all states with whether the product can legally ship there,
 * combining both product-level and COA-level checks.
 */
export function getShippableStates(
  product: ProductData,
  coaData: CoaParsedData | null,
  regulations: Map<string, StateRegulationData>,
): { stateCode: string; compliant: boolean; issues: StateComplianceIssue[] }[] {
  const results: {
    stateCode: string;
    compliant: boolean;
    issues: StateComplianceIssue[];
  }[] = [];

  for (const [code, regulation] of Array.from(regulations.entries())) {
    const allIssues: StateComplianceIssue[] = [];

    // Run product-level checks
    const productResult = checkProductStateCompliance(
      product,
      code,
      regulation,
    );
    allIssues.push(...productResult.issues);

    // Run COA-level checks if COA data is available
    if (coaData) {
      const coaResult = checkCoaStateCompliance(coaData, code, regulation);
      allIssues.push(...coaResult.issues);
    }

    // Deduplicate issues by ruleId
    const seen = new Set<string>();
    const dedupedIssues: StateComplianceIssue[] = [];
    for (const issue of allIssues) {
      if (!seen.has(issue.ruleId)) {
        seen.add(issue.ruleId);
        dedupedIssues.push(issue);
      }
    }

    const compliant = !dedupedIssues.some((i) => i.severity === "critical");

    results.push({
      stateCode: code,
      compliant,
      issues: dedupedIssues,
    });
  }

  return results;
}
