import type {
  ComplianceFinding,
  ComplianceRule,
  ProductData,
  ShopSettings,
} from "~/lib/types";

// ── Regex pattern cache ──────────────────────────────────────────
const patternCache = new Map<string, RegExp | null>();

function getCachedRegex(pattern: string, flags: string): RegExp | null {
  const key = `${pattern}:${flags}`;
  if (patternCache.has(key)) {
    const cached = patternCache.get(key)!;
    if (cached) cached.lastIndex = 0;
    return cached;
  }
  try {
    if (!isRegexSafe(pattern)) {
      patternCache.set(key, null);
      return null;
    }
    const regex = new RegExp(pattern, flags);
    patternCache.set(key, regex);
    return regex;
  } catch {
    patternCache.set(key, null);
    return null;
  }
}

/**
 * Validate regex patterns to prevent ReDoS.
 * Rejects patterns that are too long or contain nested quantifiers.
 */
function isRegexSafe(pattern: string): boolean {
  if (pattern.length > 200) return false;
  // Detect nested quantifiers like (a+)+ or (a*)*
  if (/(\+|\*|\{)\)?(\+|\*|\{)/.test(pattern)) return false;
  return true;
}

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

  // Pre-build normalized tag set for structural rules
  const normalizedTags = new Set(product.tags.map((t) => t.toLowerCase()));

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const result = evaluateRule(rule, fullText, product, normalizedTags);
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
  normalizedTags: Set<string>,
): ComplianceFinding | null {
  switch (rule.ruleType) {
    case "presence":
      return checkPresence(rule, fullText);
    case "absence":
      return checkAbsence(rule, fullText);
    case "pattern":
      return checkPattern(rule, fullText);
    case "structural":
      return checkStructural(rule, product, normalizedTags);
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
 * PATTERN: Regex-based matching with cached patterns and safety checks.
 */
function checkPattern(
  rule: ComplianceRule,
  fullText: string,
): ComplianceFinding | null {
  if (!rule.pattern) return null;

  const regex = getCachedRegex(rule.pattern, "gi");
  if (!regex) return null;

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

  return null;
}

/**
 * STRUCTURAL: Check for required fields, tags, or metafields.
 */
function checkStructural(
  rule: ComplianceRule,
  product: ProductData,
  normalizedTags: Set<string>,
): ComplianceFinding | null {
  if (!rule.keywords || rule.keywords.length === 0) return null;

  for (const check of rule.keywords) {
    if (check.startsWith("tag:")) {
      const requiredTag = check.slice(4).toLowerCase();
      if (!normalizedTags.has(requiredTag)) {
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
