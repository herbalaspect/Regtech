import { db } from "~/lib/db.server";
import type { ScanResult } from "~/lib/types";

/**
 * Persist a scan result to the database.
 * Upserts the Product record, creates a Scan, and batch-inserts Findings.
 * Replaces previous unresolved findings for this product.
 */
export async function saveScanResult(
  shopId: string,
  productData: {
    shopifyId: string;
    title: string;
    description: string;
    bodyHtml: string;
    tags: string[];
    productType: string;
    vendor: string;
    imageUrls: string[];
    contentHash?: string;
  },
  result: ScanResult,
  scanType: "manual" | "webhook" | "bulk" | "scheduled" = "manual",
): Promise<{ productId: string; scanId: string }> {
  return db.$transaction(async (tx) => {
    // 1. Upsert the product record
    const product = await tx.product.upsert({
      where: { shopId_shopifyId: { shopId, shopifyId: productData.shopifyId } },
      create: {
        shopId,
        shopifyId: productData.shopifyId,
        title: productData.title,
        description: productData.description,
        bodyHtml: productData.bodyHtml,
        tags: productData.tags.join(","),
        productType: productData.productType,
        vendor: productData.vendor,
        imageUrls: JSON.stringify(productData.imageUrls),
        category: result.category,
        complianceScore: result.complianceScore,
        lastScannedAt: result.scannedAt,
        contentHash: productData.contentHash,
      },
      update: {
        title: productData.title,
        description: productData.description,
        bodyHtml: productData.bodyHtml,
        tags: productData.tags.join(","),
        productType: productData.productType,
        vendor: productData.vendor,
        imageUrls: JSON.stringify(productData.imageUrls),
        category: result.category,
        complianceScore: result.complianceScore,
        lastScannedAt: result.scannedAt,
        contentHash: productData.contentHash,
      },
    });

    // 2. Create the scan record
    const criticalCount = result.findings.filter((f) => f.severity === "critical").length;
    const warningCount = result.findings.filter((f) => f.severity === "warning").length;
    const infoCount = result.findings.filter((f) => f.severity === "info").length;

    const scan = await tx.scan.create({
      data: {
        shopId,
        productId: product.id,
        scanType,
        status: "completed",
        totalProducts: 1,
        scannedCount: 1,
        criticalCount,
        warningCount,
        infoCount,
        startedAt: result.scannedAt,
        completedAt: result.scannedAt,
      },
    });

    // 3. Delete previous unresolved findings for this product
    await tx.finding.deleteMany({
      where: { productId: product.id, resolved: false },
    });

    // 4. Batch-insert new findings
    if (result.findings.length > 0) {
      await tx.finding.createMany({
        data: result.findings.map((f) => ({
          productId: product.id,
          scanId: scan.id,
          ruleId: f.ruleId,
          category: f.category,
          severity: f.severity,
          title: f.title,
          description: f.description,
          affectedText: f.affectedText,
          suggestion: f.suggestion,
          source: f.source,
        })),
      });
    }

    return { productId: product.id, scanId: scan.id };
  });
}

/**
 * Upsert a product record without running a scan (for initial sync).
 */
export async function upsertProduct(
  shopId: string,
  productData: {
    shopifyId: string;
    title: string;
    description: string;
    bodyHtml: string;
    tags: string[];
    productType: string;
    vendor: string;
    imageUrls: string[];
    contentHash?: string;
  },
): Promise<string> {
  const product = await db.product.upsert({
    where: { shopId_shopifyId: { shopId, shopifyId: productData.shopifyId } },
    create: {
      shopId,
      shopifyId: productData.shopifyId,
      title: productData.title,
      description: productData.description,
      bodyHtml: productData.bodyHtml,
      tags: productData.tags.join(","),
      productType: productData.productType,
      vendor: productData.vendor,
      imageUrls: JSON.stringify(productData.imageUrls),
      contentHash: productData.contentHash,
      complianceScore: "NOT_SCANNED",
    },
    update: {
      title: productData.title,
      description: productData.description,
      bodyHtml: productData.bodyHtml,
      tags: productData.tags.join(","),
      productType: productData.productType,
      vendor: productData.vendor,
      imageUrls: JSON.stringify(productData.imageUrls),
      contentHash: productData.contentHash,
    },
  });
  return product.id;
}

/**
 * Get or create a Shop record by domain.
 */
export async function upsertShop(domain: string): Promise<string> {
  const shop = await db.shop.upsert({
    where: { domain },
    create: { domain },
    update: {},
    select: { id: true },
  });
  return shop.id;
}

/**
 * Get the Shop record by domain.
 */
export async function getShopByDomain(domain: string) {
  return db.shop.findUnique({ where: { domain } });
}
