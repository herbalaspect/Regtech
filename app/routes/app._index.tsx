import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
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
import { authenticate } from "~/lib/shopify.server";
import { db } from "~/lib/db.server";
import { getShopByDomain } from "~/services/db/scan-writer";
import { DashboardStats } from "~/components/DashboardStats";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  if (!shop) {
    return json({
      totalProducts: 0,
      compliant: 0,
      warnings: 0,
      violations: 0,
      notScanned: 0,
      recentFindings: [],
    });
  }

  // Count products by compliance score in a single query
  const grouped = await db.product.groupBy({
    by: ["complianceScore"],
    where: { shopId: shop.id, deletedAt: null },
    _count: true,
  });

  const counts: Record<string, number> = {};
  for (const g of grouped) {
    counts[g.complianceScore] = g._count;
  }

  const green = counts["GREEN"] || 0;
  const yellow = counts["YELLOW"] || 0;
  const red = counts["RED"] || 0;
  const notScanned = counts["NOT_SCANNED"] || 0;
  const totalProducts = green + yellow + red + notScanned;

  // Get 10 most recent critical findings
  const recentCritical = await db.finding.findMany({
    where: {
      product: { shopId: shop.id },
      severity: "critical",
      resolved: false,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { product: { select: { title: true } } },
  });

  return json({
    totalProducts,
    compliant: green,
    warnings: yellow,
    violations: red,
    notScanned,
    recentFindings: recentCritical.map((f) => ({
      productTitle: f.product.title,
      severity: f.severity,
      title: f.title,
      createdAt: f.createdAt.toISOString(),
    })),
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  // Redirect to scan page for bulk scan
  return json({ success: true, redirect: "/app/scan" });
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
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
                    onClick={() => navigate("/app/scan")}
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
                  Recent Critical Issues
                </Text>
                {data.recentFindings.length === 0 ? (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {data.totalProducts === 0
                      ? "No products scanned yet. Run a scan to check compliance."
                      : "No critical issues found."}
                  </Text>
                ) : (
                  <BlockStack gap="200">
                    {data.recentFindings.map((finding, i) => (
                      <Text key={i} as="p" variant="bodySm">
                        <Text as="span" tone="critical" fontWeight="semibold">
                          {finding.productTitle}
                        </Text>
                        {": "}
                        {finding.title}
                      </Text>
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
