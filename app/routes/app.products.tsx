import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  InlineStack,
  Page,
  Select,
  Text,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "~/lib/shopify.server";
import { db } from "~/lib/db.server";
import { getShopByDomain } from "~/services/db/scan-writer";
import {
  ProductComplianceTable,
  type ProductRow,
} from "~/components/ProductComplianceTable";
import type { ComplianceScore } from "~/lib/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  if (!shop) {
    return json({ products: [] as ProductRow[] });
  }

  const dbProducts = await db.product.findMany({
    where: { shopId: shop.id },
    orderBy: [
      // Sort RED first, then YELLOW, GREEN, NOT_SCANNED
      { complianceScore: "asc" },
      { title: "asc" },
    ],
    include: {
      _count: {
        select: { findings: { where: { resolved: false } } },
      },
    },
  });

  const products: ProductRow[] = dbProducts.map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    complianceScore: p.complianceScore as ComplianceScore,
    findingsCount: p._count.findings,
    lastScannedAt: p.lastScannedAt?.toISOString() ?? null,
  }));

  return json({ products });
}

export default function ProductsPage() {
  const { products } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("all");

  const filteredProducts = products.filter((p) => {
    if (filter === "all") return true;
    return p.complianceScore === filter;
  });

  return (
    <Page
      title="Products"
      subtitle="Compliance status for all store products"
      primaryAction={
        <Button variant="primary" url="/app/scan">
          Scan All
        </Button>
      }
    >
      <BlockStack gap="400">
        <Card>
          <InlineStack gap="400" blockAlign="center">
            <Select
              label="Filter by status"
              labelInline
              options={[
                { label: "All", value: "all" },
                { label: "Compliant", value: "GREEN" },
                { label: "Warnings", value: "YELLOW" },
                { label: "Violations", value: "RED" },
                { label: "Not Scanned", value: "NOT_SCANNED" },
              ]}
              value={filter}
              onChange={setFilter}
            />
            <Text as="span" variant="bodySm" tone="subdued">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
            </Text>
          </InlineStack>
        </Card>

        <Card padding="0">
          {filteredProducts.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <BlockStack gap="300" inlineAlign="center">
                <Text as="p" variant="bodyMd" tone="subdued">
                  {products.length === 0
                    ? "No products synced yet. Click 'Scan All' to import and scan your products."
                    : "No products match the current filter."}
                </Text>
              </BlockStack>
            </div>
          ) : (
            <ProductComplianceTable
              products={filteredProducts}
              onProductClick={(id) => navigate(`/app/products/${id}`)}
            />
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
