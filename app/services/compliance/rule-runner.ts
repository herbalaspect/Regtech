import type {
  ComplianceFinding,
  ComplianceRule,
  ProductData,
  ShopSettings,
} from "~/lib/types";

/**
 * Run all applicable rules against a product and return findings.
 */
export function runRules(
  product: ProductData,
  rules: ComplianceRule[],
  settings: ShopSettings,
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];

  // Build the text corpus based on scan scope settings
  const textParts: string[] = [];
  if (settings.scanScope.title) textParts.push(product.title);
  if (settings.scanScope.description) {
    textParts.push(product.description);
    textParts.push(product.bodyHtml);
  }
  if (settings.scanScope.tags) textParts.push(product.tags.join(" "));
  if (settings.scanScope.metafields) {
    textParts.push(Object.values(product.metafields).join(" "));
  }

  const fullText = textParts.join(" ").toLowerCase();

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const result = evaluateRule(rule, fullText, product);
    if (result) {
      findings.push(result);
    }
  }

  return findings;
}

function evaluateRule(
  rule: ComplianceRule,
  fullText: string,
  product: ProductData,
): ComplianceFinding | null {
  switch (rule.ruleType) {
    case "presence":
      return checkPresence(rule, fullText);
    case "absence":
      return checkAbsence(rule, fullText, product);
    case "pattern":
      return checkPattern(rule, fullText, product);
    case "structural":
      return checkStructural(rule, product);
    default:
      return null;
  }
}

/**
 * PRESENCE: Required text/keywords MUST exist.
 * If none of the keywords are found, it's a finding.
 */
function checkPresence(
  rule: ComplianceRule,
  fullText: string,
): ComplianceFinding | null {
  if (!rule.keywords || rule.keywords.length === 0) return null;

  const found = rule.keywords.some((kw) =>
    fullText.includes(kw.toLowerCase()),
  );

  if (!found) {
    return {
      ruleId: rule.id,
      category: rule.category,
      severity: rule.severity,
      title: rule.name,
      description: rule.description,
      source: "rule_engine",
    };
  }

  return null;
}

/**
 * ABSENCE: Prohibited text/keywords must NOT exist.
 * If any keyword is found, it's a finding.
 */
function checkAbsence(
  rule: ComplianceRule,
  fullText: string,
  product: ProductData,
): ComplianceFinding | null {
  if (!rule.keywords || rule.keywords.length === 0) return null;

  for (const keyword of rule.keywords) {
    const lowerKw = keyword.toLowerCase();
    const index = fullText.indexOf(lowerKw);

    if (index !== -1) {
      // Extract surrounding context
      const start = Math.max(0, index - 30);
      const end = Math.min(fullText.length, index + lowerKw.length + 30);
      const affectedText = fullText.slice(start, end);

      return {
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        title: rule.name,
        description: rule.description,
        affectedText: `...${affectedText}...`,
        suggestion: `Remove or rephrase the claim "${keyword}" to avoid regulatory issues.`,
        source: "rule_engine",
      };
    }
  }

  return null;
}

/**
 * PATTERN: Regex-based matching.
 */
function checkPattern(
  rule: ComplianceRule,
  fullText: string,
  product: ProductData,
): ComplianceFinding | null {
  if (!rule.pattern) return null;

  try {
    const regex = new RegExp(rule.pattern, "gi");
    const match = regex.exec(fullText);

    if (match) {
      const start = Math.max(0, match.index - 30);
      const end = Math.min(fullText.length, match.index + match[0].length + 30);

      return {
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        title: rule.name,
        description: rule.description,
        affectedText: `...${fullText.slice(start, end)}...`,
        source: "rule_engine",
      };
    }
  } catch {
    // Invalid regex — skip this rule
  }

  return null;
}

/**
 * STRUCTURAL: Check for required fields, tags, or metafields.
 */
function checkStructural(
  rule: ComplianceRule,
  product: ProductData,
): ComplianceFinding | null {
  if (!rule.keywords || rule.keywords.length === 0) return null;

  // Structural rules use keywords as field checks:
  // "tag:allergen-warning" → product must have this tag
  // "metafield:compliance.disclaimer" → product must have this metafield
  // "productType" → product type must be set
  for (const check of rule.keywords) {
    if (check.startsWith("tag:")) {
      const requiredTag = check.slice(4).toLowerCase();
      const hasTag = product.tags.some(
        (t) => t.toLowerCase() === requiredTag,
      );
      if (!hasTag) {
        return {
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          title: rule.name,
          description: `${rule.description} (missing tag: ${requiredTag})`,
          source: "rule_engine",
        };
      }
    } else if (check.startsWith("metafield:")) {
      const requiredField = check.slice(10);
      if (!product.metafields[requiredField]) {
        return {
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          title: rule.name,
          description: `${rule.description} (missing metafield: ${requiredField})`,
          source: "rule_engine",
        };
      }
    }
  }

  return null;
}
