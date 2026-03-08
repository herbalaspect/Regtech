import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  InlineStack,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { DashboardStats } from "~/components/DashboardStats";
import type { ComplianceScore } from "~/lib/types";

interface DashboardData {
  totalProducts: number;
  compliant: number;
  warnings: number;
  violations: number;
  notScanned: number;
  recentFindings: Array<{
    productTitle: string;
    severity: string;
    title: string;
    createdAt: string;
  }>;
}

export async function loader() {
  // In production, this would query the database
  // For now, return placeholder data
  const data: DashboardData = {
    totalProducts: 0,
    compliant: 0,
    warnings: 0,
    violations: 0,
    notScanned: 0,
    recentFindings: [],
  };

  return json(data);
}

export async function action() {
  // Handle "Scan All Products" action
  // In production: trigger bulk scan job
  return json({ success: true });
}

export default function Dashboard() {
  const data = useLoaderData<DashboardData>();
  const navigate = useNavigate();
  const submit = useSubmit();

  return (
    <Page title="RegShield — Compliance Dashboard">
      <BlockStack gap="600">
        <DashboardStats
          totalProducts={data.totalProducts}
          compliant={data.compliant}
          warnings={data.warnings}
          violations={data.violations}
          notScanned={data.notScanned}
        />

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Quick Actions
                  </Text>
                </InlineStack>

                <InlineStack gap="300">
                  <Button
                    variant="primary"
                    onClick={() => submit({}, { method: "post" })}
                  >
                    Scan All Products
                  </Button>
                  <Button onClick={() => navigate("/app/products")}>
                    View Products
                  </Button>
                  <Button onClick={() => navigate("/app/settings")}>
                    Settings
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Recent Issues
                </Text>
                {data.recentFindings.length === 0 ? (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No recent findings. Run a scan to check your products.
                  </Text>
                ) : (
                  <BlockStack gap="200">
                    {data.recentFindings.map((finding, i) => (
                      <InlineStack key={i} gap="200" blockAlign="center">
                        <Text
                          as="span"
                          variant="bodySm"
                          tone={
                            finding.severity === "critical"
                              ? "critical"
                              : finding.severity === "warning"
                                ? "caution"
                                : "subdued"
                          }
                        >
                          {finding.severity.toUpperCase()}
                        </Text>
                        <Text as="span" variant="bodySm">
                          {finding.productTitle}: {finding.title}
                        </Text>
                      </InlineStack>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Monitored Categories
            </Text>
            <Text as="p" variant="bodyMd">
              RegShield monitors your products across 5 regulatory categories:
            </Text>
            <BlockStack gap="100">
              <Text as="p" variant="bodyMd">
                <strong>Dietary Supplements</strong> — FDA DSHEA disclaimers, drug claim detection, allergen warnings
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Hemp &amp; CBD</strong> — THC disclosure, therapeutic claim restrictions, CoA references
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Cosmetics</strong> — Ingredient declarations, drug claim boundaries, prohibited ingredients
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>OTC Drugs</strong> — Drug Facts labeling, active ingredients, required warnings
              </Text>
              <Text as="p" variant="bodyMd">
                <strong>Essential Oils</strong> — Therapeutic claim detection, safety warnings, classification
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
