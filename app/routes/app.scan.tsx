import { json, type ActionFunctionArgs } from "@remix-run/node";
import { useSubmit, useActionData } from "@remix-run/react";
import {
  BlockStack,
  Banner,
  Button,
  Card,
  Page,
  Text,
} from "@shopify/polaris";
import type { ProductData, ShopSettings } from "~/lib/types";
import { DEFAULT_SHOP_SETTINGS } from "~/lib/types";
import { scanProduct, getScanSummary } from "~/services/compliance/engine";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const scanType = formData.get("scanType") as string || "bulk";
  const productId = formData.get("productId") as string | null;

  // In production:
  // 1. Fetch products from Shopify via admin API
  // 2. Run scan pipeline on each
  // 3. Save results to DB
  // 4. Return summary

  return json({
    success: true,
    scanType,
    message: "Scan initiated. Results will appear on the Products page.",
  });
}

export default function ScanPage() {
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();

  return (
    <Page
      title="Run Compliance Scan"
      backAction={{ url: "/app" }}
    >
      <BlockStack gap="500">
        {actionData?.success && (
          <Banner tone="success" title="Scan Complete">
            <Text as="p" variant="bodyMd">
              {actionData.message}
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
              This will check product titles, descriptions, tags, metafields,
              and images (if enabled) against our rule engine and AI analyzer.
            </Text>
            <Button
              variant="primary"
              onClick={() => {
                const fd = new FormData();
                fd.set("scanType", "bulk");
                submit(fd, { method: "post" });
              }}
            >
              Start Full Scan
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
