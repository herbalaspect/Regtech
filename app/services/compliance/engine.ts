import type {
  ComplianceFinding,
  ComplianceScore,
  PlanTier,
  ProductCategory,
  ProductData,
  ScanResult,
  ShopSettings,
} from "~/lib/types";
import { PLAN_LIMITS } from "~/lib/types";
import { classifyProduct } from "./classifier";
import { runRules } from "./rule-runner";
import { analyzeClaimsWithAI } from "./ai-analyzer";
import { analyzeProductImages } from "./image-analyzer";
import { getAllRulesForCategory } from "./rules/index";

/**
 * Main scan orchestrator. Runs the full compliance pipeline on a product.
 * Plan tier controls which analysis stages run.
 */
export async function scanProduct(
  product: ProductData,
  settings: ShopSettings,
  categoryOverride?: ProductCategory,
  planTier: PlanTier = "compliance",
): Promise<ScanResult> {
  const limits = PLAN_LIMITS[planTier];

  // Step 1: Classify product category
  const category = categoryOverride || classifyProduct(product).category;

  // Step 2: Gather all applicable rules
  const rules = getAllRulesForCategory(
    category,
    settings.prop65Enabled,
  );

  // Step 3: Run deterministic rule engine
  const ruleFindings = runRules(product, rules, settings);

  // Step 4 & 5: Run AI text + image analysis in parallel (if plan allows)
  const aiEnabled = settings.aiTextAnalysis && limits.aiTextAnalysis && category !== "unknown";
  const imageEnabled = settings.imageScanning && limits.imageScanning && settings.scanScope.images && product.images.length > 0;

  const [aiFindings, imageFindings] = await Promise.all([
    aiEnabled
      ? analyzeClaimsWithAI(product, category).catch((error) => {
          console.error("AI text analysis failed, continuing with rule engine only:", error);
          return [] as ComplianceFinding[];
        })
      : Promise.resolve([] as ComplianceFinding[]),
    imageEnabled
      ? analyzeProductImages(product, category).then((results) =>
          results.flatMap((r) => r.findings),
        ).catch((error) => {
          console.error("Image analysis failed, continuing without:", error);
          return [] as ComplianceFinding[];
        })
      : Promise.resolve([] as ComplianceFinding[]),
  ]);

  // Step 6: Merge and deduplicate findings
  const allFindings = deduplicateFindings([
    ...ruleFindings,
    ...aiFindings,
    ...imageFindings,
  ]);

  // Step 7: Calculate compliance score
  const complianceScore = calculateScore(allFindings);

  return {
    productId: product.id,
    shopifyId: product.shopifyId,
    category,
    complianceScore,
    findings: allFindings,
    scannedAt: new Date(),
  };
}

/**
 * Scan multiple products in bulk with controlled concurrency.
 */
export async function scanProducts(
  products: ProductData[],
  settings: ShopSettings,
  planTier: PlanTier = "compliance",
): Promise<ScanResult[]> {
  const limits = PLAN_LIMITS[planTier];
  const maxProducts = Math.min(products.length, limits.maxProducts);
  const toScan = products.slice(0, maxProducts);
  const results: ScanResult[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < toScan.length; i += BATCH_SIZE) {
    const batch = toScan.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((product) => scanProduct(product, settings, undefined, planTier)),
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Deduplicate findings that cover the same issue from different sources.
 * Prefer AI findings over rule engine findings when they overlap.
 */
function deduplicateFindings(findings: ComplianceFinding[]): ComplianceFinding[] {
  const seen = new Map<string, ComplianceFinding>();

  for (const finding of findings) {
    // Create a normalized key based on the issue type
    const key = normalizeKey(finding);

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, finding);
    } else {
      // Prefer AI findings (more context) over rule engine, and higher severity
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      const existingSev = severityOrder[existing.severity];
      const newSev = severityOrder[finding.severity];

      if (finding.source !== "rule_engine" && existing.source === "rule_engine") {
        // AI finding replaces rule engine finding
        seen.set(key, { ...finding, severity: newSev > existingSev ? finding.severity : existing.severity });
      } else if (newSev > existingSev) {
        // Higher severity replaces lower
        seen.set(key, finding);
      }
    }
  }

  return Array.from(seen.values());
}

function normalizeKey(finding: ComplianceFinding): string {
  // Group by category + general issue type
  const affectedNorm = (finding.affectedText || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 50);

  if (affectedNorm) {
    return `${finding.category}:${affectedNorm}`;
  }

  // For findings without affected text, use ruleId prefix
  return `${finding.category}:${finding.ruleId}:${finding.title.toLowerCase().slice(0, 30)}`;
}

/**
 * Calculate overall compliance score based on findings.
 */
function calculateScore(findings: ComplianceFinding[]): ComplianceScore {
  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasWarning = findings.some((f) => f.severity === "warning");

  if (hasCritical) return "RED";
  if (hasWarning) return "YELLOW";
  return "GREEN";
}

/**
 * Get a human-readable summary of scan results.
 */
export function getScanSummary(result: ScanResult): string {
  const critical = result.findings.filter((f) => f.severity === "critical").length;
  const warnings = result.findings.filter((f) => f.severity === "warning").length;
  const info = result.findings.filter((f) => f.severity === "info").length;

  const parts: string[] = [];
  if (critical > 0) parts.push(`${critical} critical`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings > 1 ? "s" : ""}`);
  if (info > 0) parts.push(`${info} info`);

  if (parts.length === 0) return "No issues found — fully compliant";
  return `Found ${parts.join(", ")} issue${result.findings.length > 1 ? "s" : ""}`;
}
