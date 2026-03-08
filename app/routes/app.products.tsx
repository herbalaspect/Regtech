import { json } from "@remix-run/node";
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
import {
  ProductComplianceTable,
  type ProductRow,
} from "~/components/ProductComplianceTable";
import type { ComplianceScore } from "~/lib/types";

export async function loader() {
  // In production: fetch products from DB
  const products: ProductRow[] = [];

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
