import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData, useNavigation } from "@remix-run/react";
import {
  BlockStack,
  Banner,
  Button,
  Card,
  Page,
  Text,
  ProgressBar,
} from "@shopify/polaris";
import { authenticate } from "~/lib/shopify.server";
import { db } from "~/lib/db.server";
import { getShopByDomain, saveScanResult, upsertProduct } from "~/services/db/scan-writer";
import { fetchAllProducts, generateContentHash } from "~/services/shopify/products";
import { scanProduct } from "~/services/compliance/engine";
import { DEFAULT_SHOP_SETTINGS } from "~/lib/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  const lastScan = shop
    ? await db.scan.findFirst({
        where: { shopId: shop.id, productId: null },
        orderBy: { startedAt: "desc" },
      })
    : null;

  return json({
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

  const settings = shop.settings ? JSON.parse(shop.settings) : DEFAULT_SHOP_SETTINGS;

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

  try {
    // Fetch all products from Shopify
    const products = await fetchAllProducts(admin);

    await db.scan.update({
      where: { id: bulkScan.id },
      data: { totalProducts: products.length },
    });

    // Scan each product
    for (const product of products) {
      const contentHash = generateContentHash(product);

      // Check if content has changed since last scan
      const existingProduct = await db.product.findUnique({
        where: { shopId_shopifyId: { shopId: shop.id, shopifyId: product.shopifyId } },
      });

      if (existingProduct?.contentHash === contentHash && existingProduct.complianceScore !== "NOT_SCANNED") {
        // Content unchanged — skip re-scan, just count
        scannedCount++;
        continue;
      }

      const scanResult = await scanProduct(product, settings);

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
          imageUrls: product.images.map((i) => i.url),
          contentHash,
        },
        scanResult,
        "bulk",
      );

      scannedCount++;
      criticalCount += scanResult.findings.filter((f) => f.severity === "critical").length;
      warningCount += scanResult.findings.filter((f) => f.severity === "warning").length;
      infoCount += scanResult.findings.filter((f) => f.severity === "info").length;
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
  const { lastScan } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isScanning = navigation.state === "submitting";

  return (
    <Page
      title="Run Compliance Scan"
      backAction={{ url: "/app" }}
    >
      <BlockStack gap="500">
        {actionData?.success && (
          <Banner tone="success" title="Scan Complete">
            <Text as="p" variant="bodyMd">
              Scanned {actionData.scannedCount} products. Found{" "}
              {actionData.criticalCount} critical and{" "}
              {actionData.warningCount} warning issues.
            </Text>
          </Banner>
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
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Image Scanning</strong> — Claude Vision examines product
                images for label compliance, packaging claims, warning symbols,
                and label-vs-listing discrepancies.
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
