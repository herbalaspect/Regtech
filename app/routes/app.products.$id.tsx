import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate } from "~/lib/shopify.server";
import { db } from "~/lib/db.server";
import { getShopByDomain, saveScanResult } from "~/services/db/scan-writer";
import { fetchProduct, generateContentHash } from "~/services/shopify/products";
import { scanProduct } from "~/services/compliance/engine";
import { DEFAULT_SHOP_SETTINGS, PLAN_LIMITS, type PlanTier } from "~/lib/types";
import { ComplianceBadge } from "~/components/ComplianceBadge";
import { ScanResultsList } from "~/components/ScanResultsList";
import { UpgradeBanner } from "~/components/UpgradeBanner";
import type { ComplianceFinding, ComplianceScore } from "~/lib/types";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  if (!shop || !params.id) {
    throw new Response("Not Found", { status: 404 });
  }

  const product = await db.product.findFirst({
    where: { id: params.id, shopId: shop.id },
    include: {
      findings: {
        where: { resolved: false },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) {
    throw new Response("Not Found", { status: 404 });
  }

  const settings = shop.settings ? JSON.parse(shop.settings) : DEFAULT_SHOP_SETTINGS;

  const planTier: PlanTier = (shop.plan as PlanTier) || "compliance";

  return json({
    product: {
      id: product.id,
      shopifyId: product.shopifyId,
      title: product.title,
      category: product.category,
      complianceScore: product.complianceScore as ComplianceScore,
      lastScannedAt: product.lastScannedAt?.toISOString() ?? null,
      description: product.description,
      findings: product.findings.map((f) => ({
        ruleId: f.ruleId,
        category: f.category as ComplianceFinding["category"],
        severity: f.severity as ComplianceFinding["severity"],
        title: f.title,
        description: f.description,
        affectedText: f.affectedText ?? undefined,
        suggestion: f.suggestion ?? undefined,
        source: f.source as ComplianceFinding["source"],
      })),
    },
    settings,
    planTier,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  if (!shop || !params.id) {
    return json({ success: false, error: "Shop or product not found" }, { status: 404 });
  }

  // Get the product from DB to find its shopifyId
  const dbProduct = await db.product.findFirst({
    where: { id: params.id, shopId: shop.id },
  });

  if (!dbProduct) {
    return json({ success: false, error: "Product not found" }, { status: 404 });
  }

  // Fetch fresh product data from Shopify
  const productData = await fetchProduct(admin, dbProduct.shopifyId);
  if (!productData) {
    return json({ success: false, error: "Failed to fetch product from Shopify" }, { status: 500 });
  }

  const settings = shop.settings ? JSON.parse(shop.settings) : DEFAULT_SHOP_SETTINGS;
  const planTier: PlanTier = (shop.plan as PlanTier) || "compliance";
  const contentHash = generateContentHash(productData);

  // Run compliance scan with plan enforcement
  const scanResult = await scanProduct(productData, settings, undefined, planTier);

  // Save to DB
  await saveScanResult(
    shop.id,
    {
      shopifyId: productData.shopifyId,
      title: productData.title,
      description: productData.description,
      bodyHtml: productData.bodyHtml,
      tags: productData.tags,
      productType: productData.productType,
      vendor: productData.vendor,
      imageUrls: productData.images.map((i) => i.url),
      contentHash,
    },
    scanResult,
    "manual",
  );

  return json({ success: true });
}

export default function ProductDetailPage() {
  const { product, planTier } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const limits = PLAN_LIMITS[planTier];

  const criticalCount = product.findings.filter((f) => f.severity === "critical").length;
  const warningCount = product.findings.filter((f) => f.severity === "warning").length;
  const infoCount = product.findings.filter((f) => f.severity === "info").length;

  return (
    <Page
      title={product.title}
      backAction={{ url: "/app/products" }}
      primaryAction={
        <Button
          variant="primary"
          onClick={() => submit({}, { method: "post" })}
        >
          Re-scan Product
        </Button>
      }
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Status Overview */}
            <Card>
              <InlineStack gap="400" blockAlign="center" align="space-between">
                <InlineStack gap="300" blockAlign="center">
                  <ComplianceBadge score={product.complianceScore} />
                  {product.category && (
                    <Badge>{product.category.replace("_", " ")}</Badge>
                  )}
                </InlineStack>
                <Text as="span" variant="bodySm" tone="subdued">
                  Last scanned:{" "}
                  {product.lastScannedAt
                    ? new Date(product.lastScannedAt).toLocaleString()
                    : "Never"}
                </Text>
              </InlineStack>
            </Card>

            {/* Summary */}
            {product.findings.length > 0 && (
              <Card>
                <InlineStack gap="400">
                  {criticalCount > 0 && (
                    <Text as="span" variant="bodyMd" tone="critical">
                      {criticalCount} Critical
                    </Text>
                  )}
                  {warningCount > 0 && (
                    <Text as="span" variant="bodyMd" tone="caution">
                      {warningCount} Warning{warningCount > 1 ? "s" : ""}
                    </Text>
                  )}
                  {infoCount > 0 && (
                    <Text as="span" variant="bodyMd" tone="subdued">
                      {infoCount} Info
                    </Text>
                  )}
                </InlineStack>
              </Card>
            )}

            {/* Upgrade banner for AI features */}
            {!limits.aiTextAnalysis && (
              <UpgradeBanner
                currentPlan={planTier}
                feature="AI analysis"
                description="Upgrade to Compliance Pro for AI-powered text analysis and image scanning to catch nuanced compliance issues."
              />
            )}

            {/* Findings List */}
            <ScanResultsList
              findings={product.findings}
              emptyMessage={
                product.complianceScore === "NOT_SCANNED"
                  ? 'This product hasn\'t been scanned yet. Click "Re-scan Product" to check compliance.'
                  : "No compliance issues found. This product appears to be compliant."
              }
            />
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Product Info
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {product.description
                  ? product.description.slice(0, 200) + (product.description.length > 200 ? "..." : "")
                  : "No description available"}
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
