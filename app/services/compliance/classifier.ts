import type { ClassificationResult, ProductCategory, ProductData } from "~/lib/types";
import { CATEGORY_KEYWORDS } from "~/lib/constants";

// Pre-lowercase all keywords at module load time
const LOWERED_CATEGORY_KEYWORDS: Record<string, string[]> = {};
for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
  LOWERED_CATEGORY_KEYWORDS[category] = keywords.map((kw) => kw.toLowerCase());
}

/**
 * Shared scoring logic for classification.
 */
function buildClassificationScores(product: ProductData): Record<string, number> {
  const titleLower = product.title.toLowerCase();
  const typeLower = product.productType.toLowerCase();
  const tagsLower = product.tags.map((t) => t.toLowerCase());
  const text = [
    titleLower,
    product.description.toLowerCase(),
    product.bodyHtml.toLowerCase(),
    typeLower,
    ...tagsLower,
  ].join(" ");

  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(LOWERED_CATEGORY_KEYWORDS)) {
    let score = 0;

    for (const lowerKw of keywords) {
      if (titleLower.includes(lowerKw)) score += 3;
      if (typeLower.includes(lowerKw)) score += 4;
      if (tagsLower.some((t) => t.includes(lowerKw))) score += 2;
      if (text.includes(lowerKw)) score += 1;
    }

    scores[category] = score;
  }

  return scores;
}

/**
 * Classify a product into a regulatory category based on its content.
 * Uses keyword matching with scoring.
 */
export function classifyProduct(product: ProductData): ClassificationResult {
  const scores = buildClassificationScores(product);

  let maxScore = 0;
  let bestCategory: ProductCategory = "unknown";

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category as ProductCategory;
    }
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? maxScore / totalScore : 0;

  return {
    category: maxScore > 0 ? bestCategory : "unknown",
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Get all categories that match above a threshold.
 * Useful for products that span multiple categories (e.g., CBD cosmetic).
 */
export function classifyProductMulti(
  product: ProductData,
  threshold = 0.15,
): ClassificationResult[] {
  const scores = buildClassificationScores(product);
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  if (totalScore === 0) return [{ category: "unknown", confidence: 0 }];

  return Object.entries(scores)
    .filter(([, score]) => score / totalScore >= threshold)
    .sort(([, a], [, b]) => b - a)
    .map(([category, score]) => ({
      category: category as ProductCategory,
      confidence: Math.round((score / totalScore) * 100) / 100,
    }));
}
