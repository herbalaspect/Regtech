import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  InlineStack,
  Page,
  Pagination,
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

const PAGE_SIZE = 25;

// Severity sort order: RED first, YELLOW, NOT_SCANNED, GREEN last
const SEVERITY_ORDER: Record<string, number> = {
  RED: 0,
  YELLOW: 1,
  NOT_SCANNED: 2,
  GREEN: 3,
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const filter = url.searchParams.get("filter") || "all";

  if (!shop) {
    return json({ products: [] as ProductRow[], totalCount: 0, page: 1, totalPages: 1, filter });
  }

  const where: Record<string, unknown> = { shopId: shop.id, deletedAt: null };
  if (filter !== "all") {
    where.complianceScore = filter;
  }

  const [totalCount, dbProducts] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: {
          select: { findings: { where: { resolved: false } } },
        },
      },
    }),
  ]);

  // Sort in-memory by severity order, then by title
  const products: ProductRow[] = dbProducts
    .map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      complianceScore: p.complianceScore as ComplianceScore,
      findingsCount: p._count.findings,
      lastScannedAt: p.lastScannedAt?.toISOString() ?? null,
    }))
    .sort((a, b) => {
      const aOrder = SEVERITY_ORDER[a.complianceScore] ?? 99;
      const bOrder = SEVERITY_ORDER[b.complianceScore] ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.title.localeCompare(b.title);
    });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return json({ products, totalCount, page, totalPages, filter });
}

export default function ProductsPage() {
  const { products, totalCount, page, totalPages, filter: initialFilter } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<string>(initialFilter);

  const handleFilterChange = (value: string) => {
    setFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(newPage));
    setSearchParams(params);
  };

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
              onChange={handleFilterChange}
            />
            <Text as="span" variant="bodySm" tone="subdued">
              {totalCount} product{totalCount !== 1 ? "s" : ""}
            </Text>
          </InlineStack>
        </Card>

        <Card padding="0">
          {products.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <BlockStack gap="300" inlineAlign="center">
                <Text as="p" variant="bodyMd" tone="subdued">
                  {totalCount === 0
                    ? "No products synced yet. Click 'Scan All' to import and scan your products."
                    : "No products match the current filter."}
                </Text>
              </BlockStack>
            </div>
          ) : (
            <ProductComplianceTable
              products={products}
              onProductClick={(id) => navigate(`/app/products/${id}`)}
            />
          )}
        </Card>

        {totalPages > 1 && (
          <InlineStack align="center">
            <Pagination
              hasPrevious={page > 1}
              hasNext={page < totalPages}
              onPrevious={() => handlePageChange(page - 1)}
              onNext={() => handlePageChange(page + 1)}
              label={`Page ${page} of ${totalPages}`}
            />
          </InlineStack>
        )}
      </BlockStack>
    </Page>
  );
}
