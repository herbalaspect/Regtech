import Anthropic from "@anthropic-ai/sdk";
import type {
  ClaimAnalysis,
  ClassificationResult,
  ComplianceFinding,
  ProductCategory,
  ProductData,
} from "~/lib/types";

// ── Anthropic client singleton ───────────────────────────────────
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// ── Bounded in-memory cache ──────────────────────────────────────
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const cache = new Map<string, { result: unknown; timestamp: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.result as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, result: unknown): void {
  // Evict oldest entries when at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { result, timestamp: Date.now() });
}

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
    }
  }
}, 30 * 60 * 1000);

/**
 * Wrap an API call with a timeout.
 */
async function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("API call timed out")), ms),
  );
  return Promise.race([promise, timeout]);
}

// ── Product Classification ─────────────────────────────────────────

export async function classifyProductWithAI(
  product: ProductData,
): Promise<ClassificationResult> {
  const cacheKey = `classify:${product.shopifyId}:${product.title}`;
  const cached = getCached<ClassificationResult>(cacheKey);
  if (cached) return cached;

  const anthropic = getClient();

  const message = await withTimeout(anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Classify this product into ONE of these regulatory categories:
- supplement (dietary supplements, vitamins, nutraceuticals)
- hemp_cbd (hemp, CBD, cannabinoid products)
- cosmetic (skincare, beauty, personal care)
- otc_drug (over-the-counter medications, topical drugs)
- essential_oil (essential oils, aromatherapy)
- unknown (doesn't fit any category)

Product:
Title: ${product.title}
Type: ${product.productType}
Tags: ${product.tags.join(", ")}
Description: ${product.description.slice(0, 500)}

Respond in JSON format only:
{"category": "...", "confidence": 0.0-1.0, "reasoning": "..."}`,
      },
    ],
  }));

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const result = JSON.parse(text) as ClassificationResult;
    setCache(cacheKey, result);
    return result;
  } catch {
    return { category: "unknown", confidence: 0, reasoning: "Failed to parse AI response" };
  }
}

// ── Claim Analysis ─────────────────────────────────────────────────

export async function analyzeClaimsWithAI(
  product: ProductData,
  category: ProductCategory,
): Promise<ComplianceFinding[]> {
  const cacheKey = `claims:${product.shopifyId}:${category}:${product.description.slice(0, 50)}`;
  const cached = getCached<ComplianceFinding[]>(cacheKey);
  if (cached) return cached;

  const anthropic = getClient();

  const categoryContext = getCategoryContext(category);

  const message = await withTimeout(anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are a regulatory compliance expert. Analyze this ${category} product listing for compliance issues.

${categoryContext}

Product:
Title: ${product.title}
Description: ${product.description}
Body HTML (listing content): ${product.bodyHtml.slice(0, 2000)}
Tags: ${product.tags.join(", ")}

Identify ALL regulatory compliance issues. For each issue, classify its severity:
- critical: Clear regulatory violation (drug claims, missing required disclaimers, prohibited ingredients)
- warning: Potential issue that should be reviewed (borderline claims, missing recommended disclosures)
- info: Best practice recommendation

Respond in JSON format only as an array:
[{
  "claim": "the specific text or issue",
  "claimType": "structure_function|drug_claim|cosmetic|health|general",
  "severity": "critical|warning|info",
  "explanation": "why this is an issue",
  "suggestedFix": "compliant alternative language"
}]

If no issues found, return an empty array: []`,
      },
    ],
  }));

  const text =
    message.content[0].type === "text" ? message.content[0].text : "[]";

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const claims: ClaimAnalysis[] = JSON.parse(jsonMatch?.[0] || "[]");

    const findings: ComplianceFinding[] = claims.map((claim, i) => ({
      ruleId: `ai-${category}-${i}`,
      category,
      severity: claim.severity,
      title: `AI: ${claim.claimType.replace(/_/g, " ")} detected`,
      description: claim.explanation,
      affectedText: claim.claim,
      suggestion: claim.suggestedFix,
      source: "ai_text" as const,
    }));

    setCache(cacheKey, findings);
    return findings;
  } catch {
    return [];
  }
}

// ── Fix Suggestion Generation ──────────────────────────────────────

export async function suggestFixWithAI(
  finding: ComplianceFinding,
  productDescription: string,
): Promise<string> {
  const anthropic = getClient();

  const message = await withTimeout(anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are a regulatory compliance expert. A compliance scan found this issue:

Issue: ${finding.title}
Description: ${finding.description}
Affected text: ${finding.affectedText || "N/A"}
Category: ${finding.category}

Original product description (first 500 chars):
${productDescription.slice(0, 500)}

Provide a specific, compliant rewrite of the affected text. Keep the marketing intent but make it regulatory compliant. Response should be ONLY the rewritten text, nothing else.`,
      },
    ],
  }));

  return message.content[0].type === "text" ? message.content[0].text : "";
}

// ── Category-specific regulatory context for prompts ───────────────

function getCategoryContext(category: ProductCategory): string {
  const contexts: Record<ProductCategory, string> = {
    supplement: `REGULATORY CONTEXT — Dietary Supplements:
- Must include DSHEA disclaimer: "These statements have not been evaluated by the FDA..."
- Structure/function claims are OK with disclaimer (e.g., "supports immune health")
- Drug claims are PROHIBITED (treat, cure, diagnose, prevent disease)
- Must reference Supplement Facts panel
- Allergen warnings required for major allergens
- Weight loss claims need strong scientific substantiation (FTC)`,

    hemp_cbd: `REGULATORY CONTEXT — Hemp/CBD Products:
- FDA has NOT approved CBD as dietary supplement or food additive
- Therapeutic claims are PROHIBITED (pain relief, anxiety, sleep aid)
- Disease claims are PROHIBITED
- Must disclose THC content (<0.3% federal limit)
- Should reference Certificate of Analysis (CoA)
- Ingestible CBD products face heightened regulatory risk
- State legality varies — shipping restrictions should be noted`,

    cosmetic: `REGULATORY CONTEXT — Cosmetics:
- Regulated under FD&C Act and Fair Packaging and Labeling Act
- Must include ingredient declaration in descending order by weight
- CANNOT make drug claims (treat, cure, affect body structure/function)
- Anti-aging claims that go beyond "temporary improvement in appearance" cross into drug territory
- SPF claims = OTC drug, requires Drug Facts label
- Prohibited ingredients: mercury, hydroquinone (OTC)
- "Organic"/"natural" claims must be accurate`,

    otc_drug: `REGULATORY CONTEXT — OTC Drugs:
- Must follow OTC Drug Monograph or have NDA
- Drug Facts label REQUIRED (active ingredients, uses, warnings, directions, inactive ingredients)
- Active ingredient concentration must be stated
- Required warnings about when to stop use and consult doctor
- "For external use only" for topicals
- Cannot claim to be prescription-strength
- Only FDA-approved active ingredients allowed`,

    essential_oil: `REGULATORY CONTEXT — Essential Oils:
- Classified as cosmetic OR drug based on intended use/claims
- Cosmetic claims OK: cleanse, beautify, attract
- Drug claims PROHIBITED: treat pain, cure infection, relieve symptoms
- Internal use/ingestion claims are dangerous and drug-claim territory
- "Therapeutic grade" is an unregulated marketing term
- Safety warnings needed: dilution, patch test, children/pregnancy/pets
- Keep out of reach of children`,

    unknown: "Analyze for general FTC advertising compliance and any health-related claims.",
  };

  return contexts[category];
}
