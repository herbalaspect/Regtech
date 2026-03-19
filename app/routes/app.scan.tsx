import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData, useNavigation } from "@remix-run/react";
import {
  BlockStack,
  Banner,
  Button,
  Card,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate } from "~/lib/shopify.server";
import { db } from "~/lib/db.server";
import { getShopByDomain, saveScanResult } from "~/services/db/scan-writer";
import { fetchAllProducts, generateContentHash } from "~/services/shopify/products";
import { scanProduct } from "~/services/compliance/engine";
import { DEFAULT_SHOP_SETTINGS, PLAN_LIMITS, type PlanTier } from "~/lib/types";
import { UpgradeBanner } from "~/components/UpgradeBanner";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  const lastScan = shop
    ? await db.scan.findFirst({
        where: { shopId: shop.id, productId: null },
        orderBy: { startedAt: "desc" },
      })
    : null;

  const planTier: PlanTier = (shop?.plan as PlanTier) || "compliance";

  return json({
    planTier,
    lastScan: lastScan
      ? {
          startedAt: lastScan.startedAt.toISOString(),
          completedAt: lastScan.completedAt?.toISOString() ?? null,
          totalProducts: lastScan.totalProducts,
          criticalCount: lastScan.criticalCount,
          warningCount: lastScan.warningCount,
        }
      : null,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  if (!shop) {
    return json({ success: false, error: "Shop not found" }, { status: 404 });
  }

  const planTier: PlanTier = (shop.plan as PlanTier) || "compliance";
  const limits = PLAN_LIMITS[planTier];
  const settings = shop.settings
    ? { ...DEFAULT_SHOP_SETTINGS, ...JSON.parse(shop.settings) }
    : DEFAULT_SHOP_SETTINGS;

  // Create a bulk scan record
  const bulkScan = await db.scan.create({
    data: {
      shopId: shop.id,
      scanType: "bulk",
      status: "running",
    },
  });

  let scannedCount = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  let limitReached = false;

  try {
    // Fetch all products from Shopify
    const products = await fetchAllProducts(admin);

    // Enforce plan product limit
    const productsToScan = products.slice(0, limits.maxProducts);
    limitReached = products.length > limits.maxProducts;

    await db.scan.update({
      where: { id: bulkScan.id },
      data: { totalProducts: productsToScan.length },
    });

    // Pre-fetch all existing products to avoid N+1 queries
    const existingProducts = await db.product.findMany({
      where: { shopId: shop.id },
      select: { shopifyId: true, contentHash: true, complianceScore: true },
    });
    const existingMap = new Map(
      existingProducts.map((p) => [p.shopifyId, p]),
    );

    // Process in batches of 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < productsToScan.length; i += BATCH_SIZE) {
      const batch = productsToScan.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (product) => {
        const contentHash = generateContentHash(product);
        const existing = existingMap.get(product.shopifyId);

        if (existing?.contentHash === contentHash && existing.complianceScore !== "NOT_SCANNED") {
          return null; // Skip unchanged products
        }

        const scanResult = await scanProduct(product, settings, undefined, planTier);

        await saveScanResult(
          shop.id,
          {
            shopifyId: product.shopifyId,
            title: product.title,
            description: product.description,
            bodyHtml: product.bodyHtml,
            tags: product.tags,
            productType: product.productType,
            vendor: product.vendor,
            imageUrls: product.images.map((img) => img.url),
            contentHash,
          },
          scanResult,
          "bulk",
        );

        return scanResult;
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        scannedCount++;
        if (result) {
          criticalCount += result.findings.filter((f) => f.severity === "critical").length;
          warningCount += result.findings.filter((f) => f.severity === "warning").length;
          infoCount += result.findings.filter((f) => f.severity === "info").length;
        }
      }
    }

    // Update bulk scan with final counts
    await db.scan.update({
      where: { id: bulkScan.id },
      data: {
        status: "completed",
        scannedCount,
        criticalCount,
        warningCount,
        infoCount,
        completedAt: new Date(),
      },
    });

    return json({
      success: true,
      scannedCount,
      criticalCount,
      warningCount,
      infoCount,
      limitReached,
    });
  } catch (error) {
    await db.scan.update({
      where: { id: bulkScan.id },
      data: { status: "failed", completedAt: new Date() },
    });
    throw error;
  }
}

export default function ScanPage() {
  const { lastScan, planTier } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isScanning = navigation.state === "submitting";
  const limits = PLAN_LIMITS[planTier];

  return (
    <Page
      title="Run Compliance Scan"
      backAction={{ url: "/app" }}
    >
      <BlockStack gap="500">
        {actionData?.success && "scannedCount" in actionData && (
          <Banner tone="success" title="Scan Complete">
            <Text as="p" variant="bodyMd">
              Scanned {actionData.scannedCount} products. Found{" "}
              {actionData.criticalCount} critical and{" "}
              {actionData.warningCount} warning issues.
            </Text>
          </Banner>
        )}

        {actionData && "limitReached" in actionData && actionData.limitReached && (
          <UpgradeBanner
            currentPlan={planTier}
            feature="more products"
            description={`Your ${planTier === "compliance" ? "Compliance" : "Pro"} plan is limited to ${limits.maxProducts} products. Upgrade to scan your full catalog.`}
          />
        )}

        {isScanning && (
          <Banner tone="info" title="Scan in Progress">
            <Text as="p" variant="bodyMd">
              Scanning your products for compliance issues...
            </Text>
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Full Store Scan
            </Text>
            <Text as="p" variant="bodyMd">
              Scan all products in your store for regulatory compliance issues.
              Products whose content hasn't changed since the last scan will be skipped.
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Plan limit: up to {limits.maxProducts === Infinity ? "unlimited" : limits.maxProducts} products
              {limits.aiTextAnalysis ? " • AI text analysis enabled" : ""}
              {limits.imageScanning ? " • Image scanning enabled" : ""}
            </Text>
            {lastScan && (
              <Text as="p" variant="bodySm" tone="subdued">
                Last scan: {new Date(lastScan.startedAt).toLocaleString()} —{" "}
                {lastScan.totalProducts} products,{" "}
                {lastScan.criticalCount} critical issues
              </Text>
            )}
            <Button
              variant="primary"
              loading={isScanning}
              onClick={() => submit({}, { method: "post" })}
            >
              {isScanning ? "Scanning..." : "Start Full Scan"}
            </Button>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              What Gets Checked
            </Text>
            <BlockStack gap="100">
              <Text as="p" variant="bodyMd">
                <strong>Rule Engine</strong> — Deterministic checks for required
                disclaimers, prohibited claims, ingredient lists, and required
                warnings across all enabled categories.
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>AI Text Analysis</strong> — Claude analyzes product text
                for nuanced health claims, structure/function vs drug claim
                classification, and contextual severity assessment.
                {!limits.aiTextAnalysis && " (Requires Pro plan)"}
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Image Scanning</strong> — Claude Vision examines product
                images for label compliance, packaging claims, warning symbols,
                and label-vs-listing discrepancies.
                {!limits.imageScanning && " (Requires Pro plan)"}
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
