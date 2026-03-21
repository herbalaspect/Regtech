import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData, useNavigation } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Button,
  Card,
  Checkbox,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "~/lib/shopify.server";
import { db } from "~/lib/db.server";
import { getShopByDomain } from "~/services/db/scan-writer";
import { DEFAULT_SHOP_SETTINGS, type PlanTier, type ShopSettings } from "~/lib/types";
import { StateComplianceMap } from "~/components/StateComplianceMap";
import { STATE_REGULATION_MAP } from "~/services/state-regulations/seed-data";
import { checkProductStateCompliance } from "~/services/state-regulations/state-compliance-engine";
import type { ProductData, ComplianceScore } from "~/lib/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  if (!shop) {
    return json({ products: [], alerts: [], targetStates: [] as string[] });
  }

  const settings: ShopSettings = shop.settings
    ? { ...DEFAULT_SHOP_SETTINGS, ...JSON.parse(shop.settings) }
    : DEFAULT_SHOP_SETTINGS;

  // Get all hemp/CBD products
  const products = await db.product.findMany({
    where: {
      shopId: shop.id,
      deletedAt: null,
      category: { in: ["hemp_cbd", "supplement", "essential_oil"] },
    },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });

  // Get unread state compliance alerts
  const alerts = await db.stateComplianceAlert.findMany({
    where: { shopId: shop.id, dismissed: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Get target states from settings (default: all states where hemp is legal)
  const targetStates: string[] = (settings as ShopSettings & { targetStates?: string[] }).targetStates
    || Object.keys(STATE_REGULATION_MAP);

  return json({
    products: products.map((p) => ({
      id: p.id,
      shopifyId: p.shopifyId,
      title: p.title,
      description: p.description,
      bodyHtml: p.bodyHtml,
      tags: p.tags,
      productType: p.productType,
      category: p.category,
      complianceScore: p.complianceScore as ComplianceScore,
    })),
    alerts: alerts.map((a) => ({
      id: a.id,
      stateCode: a.stateCode,
      alertType: a.alertType,
      severity: a.severity,
      title: a.title,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    })),
    targetStates,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  if (!shop) {
    return json({ success: false, error: "Shop not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "scan_states") {
    const productId = formData.get("productId") as string;
    const targetStatesJson = formData.get("targetStates") as string;
    const targetStates: string[] = JSON.parse(targetStatesJson || "[]");

    const product = await db.product.findFirst({
      where: { id: productId, shopId: shop.id },
    });

    if (!product) {
      return json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const productData: ProductData = {
      id: product.id,
      shopifyId: product.shopifyId,
      title: product.title,
      description: product.description,
      bodyHtml: product.bodyHtml,
      tags: product.tags.split(",").filter(Boolean),
      productType: product.productType,
      vendor: product.vendor,
      images: [],
      metafields: {},
    };

    const results = targetStates
      .filter((sc) => STATE_REGULATION_MAP[sc])
      .map((stateCode) => {
        const regulation = STATE_REGULATION_MAP[stateCode];
        return checkProductStateCompliance(productData, stateCode, regulation);
      });

    return json({
      success: true,
      results: results.map((r) => ({
        stateCode: r.stateCode,
        stateName: r.stateName,
        compliant: r.compliant,
        issueCount: r.issues.length,
        criticalCount: r.issues.filter((i) => i.severity === "critical").length,
        warningCount: r.issues.filter((i) => i.severity === "warning").length,
        issues: r.issues,
      })),
    });
  }

  if (intent === "dismiss_alert") {
    const alertId = formData.get("alertId") as string;
    await db.stateComplianceAlert.update({
      where: { id: alertId },
      data: { dismissed: true, readAt: new Date() },
    });
    return json({ success: true });
  }

  return json({ success: false, error: "Unknown intent" }, { status: 400 });
}

export default function StateCompliancePage() {
  const { products, alerts, targetStates } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isScanning = navigation.state === "submitting";

  const [selectedProduct, setSelectedProduct] = useState<string>(products[0]?.id || "");

  const handleScanStates = () => {
    if (!selectedProduct) return;
    const formData = new FormData();
    formData.set("intent", "scan_states");
    formData.set("productId", selectedProduct);
    formData.set("targetStates", JSON.stringify(targetStates));
    submit(formData, { method: "post" });
  };

  const results = actionData && "results" in actionData ? actionData.results : null;

  return (
    <Page
      title="State Compliance"
      subtitle="Check product compliance across all 50 states"
      backAction={{ url: "/app" }}
    >
      <BlockStack gap="500">
        {/* Regulation Change Alerts */}
        {alerts.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Regulation Alerts
              </Text>
              {alerts.map((alert) => (
                <Banner
                  key={alert.id}
                  tone={alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info"}
                  title={`${alert.stateCode}: ${alert.title}`}
                  onDismiss={() => {
                    const formData = new FormData();
                    formData.set("intent", "dismiss_alert");
                    formData.set("alertId", alert.id);
                    submit(formData, { method: "post" });
                  }}
                >
                  <p>{alert.description}</p>
                </Banner>
              ))}
            </BlockStack>
          </Card>
        )}

        {/* Product Selector & Scan */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              State-by-State Compliance Check
            </Text>
            <Text as="p" variant="bodyMd">
              Select a product to check its compliance against regulations in all target states.
              This checks THC limits, banned cannabinoids, labeling requirements, advertising rules, and more.
            </Text>
            <InlineStack gap="400" blockAlign="end">
              <div style={{ flexGrow: 1 }}>
                <Select
                  label="Product"
                  options={products.map((p) => ({
                    label: `${p.title} (${p.category || "unclassified"})`,
                    value: p.id,
                  }))}
                  value={selectedProduct}
                  onChange={setSelectedProduct}
                />
              </div>
              <Button
                variant="primary"
                loading={isScanning}
                onClick={handleScanStates}
                disabled={!selectedProduct}
              >
                {isScanning ? "Checking States..." : "Check All States"}
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Results */}
        {results && (
          <StateComplianceMap
            results={results as Array<{
              stateCode: string;
              stateName: string;
              compliant: boolean;
              issueCount: number;
              criticalCount: number;
              warningCount: number;
            }>}
          />
        )}

        {/* Info Card */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              What Gets Checked Per State
            </Text>
            <BlockStack gap="100">
              <Text as="p" variant="bodyMd">
                <strong>THC Limits</strong> — Delta-9 THC percentage, total THC, per-serving and per-package mg limits for edibles
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Banned Cannabinoids</strong> — Delta-8 THC, THCO, HHC, and other synthetic cannabinoids restricted in specific states
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Labeling Requirements</strong> — State-mandated label elements like universal symbols, batch numbers, lab results, warnings
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Packaging Rules</strong> — Child-resistant, opaque, tamper-evident, no appeal to minors
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Advertising Restrictions</strong> — Health claims, therapeutic claims, targeting minors, platform-specific ad policies
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Licensing &amp; Shipping</strong> — Whether a license is required, shipping restrictions in/out of state
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>

        {/* COA Info */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Certificate of Analysis (COA)
            </Text>
            <Text as="p" variant="bodyMd">
              Upload a COA to validate lab results against state-specific THC limits and contaminant
              requirements. Go to a product's detail page to upload and manage COA documents.
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Supported formats: Structured text, JSON from lab integrations. PDF parsing coming soon.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
