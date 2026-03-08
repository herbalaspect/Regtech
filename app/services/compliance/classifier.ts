import type { ClassificationResult, ProductCategory, ProductData } from "~/lib/types";
import { CATEGORY_KEYWORDS } from "~/lib/constants";

/**
 * Classify a product into a regulatory category based on its content.
 * Uses keyword matching with scoring. AI classification can supplement this.
 */
export function classifyProduct(product: ProductData): ClassificationResult {
  const text = [
    product.title,
    product.description,
    product.bodyHtml,
    product.productType,
    ...product.tags,
  ]
    .join(" ")
    .toLowerCase();

  const scores: Record<string, number> = {};
  let maxScore = 0;
  let bestCategory: ProductCategory = "unknown";

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;

    for (const keyword of keywords) {
      const lowerKw = keyword.toLowerCase();

      // Title matches are weighted 3x
      if (product.title.toLowerCase().includes(lowerKw)) {
        score += 3;
      }

      // Product type matches are weighted 4x
      if (product.productType.toLowerCase().includes(lowerKw)) {
        score += 4;
      }

      // Tag matches are weighted 2x
      if (product.tags.some((t) => t.toLowerCase().includes(lowerKw))) {
        score += 2;
      }

      // Description matches
      if (text.includes(lowerKw)) {
        score += 1;
      }
    }

    scores[category] = score;

    if (score > maxScore) {
      maxScore = score;
      bestCategory = category as ProductCategory;
    }
  }

  // Calculate confidence as ratio of best score to total
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
  const text = [
    product.title,
    product.description,
    product.bodyHtml,
    product.productType,
    ...product.tags,
  ]
    .join(" ")
    .toLowerCase();

  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      const lowerKw = keyword.toLowerCase();
      if (product.title.toLowerCase().includes(lowerKw)) score += 3;
      if (product.productType.toLowerCase().includes(lowerKw)) score += 4;
      if (product.tags.some((t) => t.toLowerCase().includes(lowerKw))) score += 2;
      if (text.includes(lowerKw)) score += 1;
    }
    scores[category] = score;
  }

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
