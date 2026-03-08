import { json, type LoaderFunctionArgs } from "@remix-run/node";
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
import { ComplianceBadge } from "~/components/ComplianceBadge";
import { ScanResultsList } from "~/components/ScanResultsList";
import type { ComplianceFinding, ComplianceScore } from "~/lib/types";

interface ProductDetail {
  id: string;
  title: string;
  category: string | null;
  complianceScore: ComplianceScore;
  lastScannedAt: string | null;
  findings: ComplianceFinding[];
  description: string;
}

export async function loader({ params }: LoaderFunctionArgs) {
  const productId = params.id;

  // In production: fetch from DB
  const product: ProductDetail = {
    id: productId || "",
    title: "Loading...",
    category: null,
    complianceScore: "NOT_SCANNED",
    lastScannedAt: null,
    findings: [],
    description: "",
  };

  return json({ product });
}

export async function action({ params }: LoaderFunctionArgs) {
  const productId = params.id;
  // In production: trigger single product scan
  return json({ success: true, productId });
}

export default function ProductDetailPage() {
  const { product } = useLoaderData<typeof loader>();
  const submit = useSubmit();

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
                    <Badge>{product.category}</Badge>
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
