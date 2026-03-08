import Anthropic from "@anthropic-ai/sdk";
import type {
  ComplianceFinding,
  ImageAnalysisResult,
  ProductCategory,
  ProductData,
} from "~/lib/types";

// ── Image analysis cache ───────────────────────────────────────────
const imageCache = new Map<string, { result: ImageAnalysisResult; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (images change less frequently)

function getCachedImage(key: string): ImageAnalysisResult | null {
  const entry = imageCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.result;
  }
  imageCache.delete(key);
  return null;
}

// ── Analyze Product Images ─────────────────────────────────────────

export async function analyzeProductImages(
  product: ProductData,
  category: ProductCategory,
  apiKey?: string,
): Promise<ImageAnalysisResult[]> {
  if (!product.images || product.images.length === 0) return [];

  const results: ImageAnalysisResult[] = [];

  // Analyze each image (limit to first 5 to control costs)
  const imagesToAnalyze = product.images.slice(0, 5);

  for (const image of imagesToAnalyze) {
    const cacheKey = `img:${image.url}:${category}`;
    const cached = getCachedImage(cacheKey);
    if (cached) {
      results.push(cached);
      continue;
    }

    try {
      const result = await analyzeSingleImage(image.url, product, category, apiKey);
      imageCache.set(cacheKey, { result, timestamp: Date.now() });
      results.push(result);
    } catch (error) {
      // Skip images that fail to analyze
      console.error(`Failed to analyze image ${image.url}:`, error);
    }
  }

  return results;
}

async function analyzeSingleImage(
  imageUrl: string,
  product: ProductData,
  category: ProductCategory,
  apiKey?: string,
): Promise<ImageAnalysisResult> {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });

  const categoryPrompt = getImageAnalysisPrompt(category);

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: imageUrl },
          },
          {
            type: "text",
            text: `You are a regulatory compliance expert analyzing a product image for a ${category} product.

Product context:
Title: ${product.title}
Listed description (first 300 chars): ${product.description.slice(0, 300)}

${categoryPrompt}

Analyze this product image and respond in JSON format:
{
  "extractedText": ["all text visible on labels, packaging, or in the image"],
  "labelDetected": true/false,
  "supplementFactsDetected": true/false,
  "drugFactsDetected": true/false,
  "warningSymbolsDetected": ["list of warning symbols/icons seen"],
  "findings": [
    {
      "severity": "critical|warning|info",
      "title": "brief issue title",
      "description": "detailed explanation",
      "affectedText": "the specific text on the label causing the issue",
      "suggestion": "how to fix it"
    }
  ],
  "labelVsListingDiscrepancies": [
    "any differences between what the label says and the product listing description"
  ]
}`,
          },
        ],
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "{}";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] || "{}");

    const findings: ComplianceFinding[] = (parsed.findings || []).map(
      (f: Record<string, string>, i: number) => ({
        ruleId: `img-${category}-${i}`,
        category,
        severity: f.severity || "warning",
        title: `Image: ${f.title}`,
        description: f.description,
        affectedText: f.affectedText,
        suggestion: f.suggestion,
        source: "ai_image" as const,
      }),
    );

    // Add discrepancy findings
    if (parsed.labelVsListingDiscrepancies?.length > 0) {
      for (const discrepancy of parsed.labelVsListingDiscrepancies) {
        findings.push({
          ruleId: `img-discrepancy-${findings.length}`,
          category,
          severity: "warning",
          title: "Image: Label vs Listing Discrepancy",
          description: discrepancy,
          source: "ai_image",
        });
      }
    }

    return {
      imageUrl,
      extractedText: parsed.extractedText || [],
      findings,
      labelDetected: parsed.labelDetected || false,
      supplementFactsDetected: parsed.supplementFactsDetected || false,
      drugFactsDetected: parsed.drugFactsDetected || false,
      warningSymbolsDetected: parsed.warningSymbolsDetected || [],
    };
  } catch {
    return {
      imageUrl,
      extractedText: [],
      findings: [],
      labelDetected: false,
      supplementFactsDetected: false,
      drugFactsDetected: false,
      warningSymbolsDetected: [],
    };
  }
}

// ── Category-specific image analysis prompts ───────────────────────

function getImageAnalysisPrompt(category: ProductCategory): string {
  const prompts: Record<string, string> = {
    supplement: `CHECK FOR:
1. Supplement Facts panel — is it present and properly formatted?
2. DSHEA disclaimer visible on label?
3. Any health/drug claims printed on the packaging (not just the listing)?
4. Allergen warnings visible?
5. Serving size and ingredient list visible?
6. Any claims on the label that differ from or aren't in the product listing?
7. "Dietary supplement" designation visible?`,

    hemp_cbd: `CHECK FOR:
1. THC content disclosure on label?
2. Any therapeutic/health claims on packaging (pain, anxiety, sleep, etc.)?
3. CoA reference or QR code for lab results?
4. Hemp leaf imagery with misleading health associations?
5. Any claims on the label that differ from the product listing?
6. Dosage/serving instructions that imply medical use?
7. State compliance markings?`,

    cosmetic: `CHECK FOR:
1. Ingredient list visible and in descending order by weight?
2. Any drug claims on packaging (treats, cures, heals)?
3. "For external use only" statement where needed?
4. SPF claims (would require OTC drug compliance)?
5. Prohibited ingredients listed?
6. Anti-aging claims that cross into drug territory?
7. Any claims on label not reflected in the product listing?`,

    otc_drug: `CHECK FOR:
1. Drug Facts panel — is it present and properly formatted?
2. Active ingredient(s) clearly listed with concentration?
3. Uses/indications section present?
4. Warnings section present and complete?
5. Directions for use present?
6. "For external use only" for topicals?
7. Inactive ingredients listed?
8. Expiration date visible?
9. Any claims that exceed OTC monograph scope?`,

    essential_oil: `CHECK FOR:
1. Any therapeutic/drug claims on label (treats, cures, heals)?
2. Safety warnings visible (dilution, patch test, keep from children)?
3. "Therapeutic grade" or similar unregulated claims?
4. Internal use/ingestion instructions?
5. Ingredient/purity information?
6. Pregnancy/children/pet warnings?
7. Any claims on label not in the product listing?`,

    unknown: `CHECK FOR:
1. Any health or medical claims visible on packaging
2. Required warnings or disclaimers
3. Ingredient lists
4. Any regulatory markings or certifications
5. Claims that differ from the product listing`,
  };

  return prompts[category] || prompts.unknown;
}
