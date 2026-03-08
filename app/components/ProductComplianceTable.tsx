import {
  IndexTable,
  Text,
  useBreakpoints,
} from "@shopify/polaris";
import type { ComplianceScore } from "~/lib/types";
import { ComplianceBadge } from "./ComplianceBadge";

export interface ProductRow {
  id: string;
  title: string;
  category: string | null;
  complianceScore: ComplianceScore;
  findingsCount: number;
  lastScannedAt: string | null;
}

interface ProductComplianceTableProps {
  products: ProductRow[];
  onProductClick: (id: string) => void;
}

export function ProductComplianceTable({
  products,
  onProductClick,
}: ProductComplianceTableProps) {
  const condensed = useBreakpoints().smDown;

  const rowMarkup = products.map((product, index) => (
    <IndexTable.Row
      id={product.id}
      key={product.id}
      position={index}
      onClick={() => onProductClick(product.id)}
    >
      <IndexTable.Cell>
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {product.title}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {product.category || "—"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ComplianceBadge score={product.complianceScore} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        {product.findingsCount > 0 ? product.findingsCount : "—"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {product.lastScannedAt
          ? new Date(product.lastScannedAt).toLocaleDateString()
          : "Never"}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <IndexTable
      condensed={condensed}
      itemCount={products.length}
      headings={[
        { title: "Product" },
        { title: "Category" },
        { title: "Status" },
        { title: "Issues" },
        { title: "Last Scanned" },
      ]}
      selectable={false}
    >
      {rowMarkup}
    </IndexTable>
  );
}
