import {
  BlockStack,
  Card,
  InlineGrid,
  Text,
} from "@shopify/polaris";

interface DashboardStatsProps {
  totalProducts: number;
  compliant: number;
  warnings: number;
  violations: number;
  notScanned: number;
}

export function DashboardStats({
  totalProducts,
  compliant,
  warnings,
  violations,
  notScanned,
}: DashboardStatsProps) {
  return (
    <InlineGrid columns={{ xs: 1, sm: 2, lg: 4 }} gap="400">
      <Card>
        <BlockStack gap="200">
          <Text as="p" variant="bodySm" tone="subdued">
            Total Products
          </Text>
          <Text as="p" variant="headingXl">
            {totalProducts}
          </Text>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="200">
          <Text as="p" variant="bodySm" tone="success">
            Compliant
          </Text>
          <Text as="p" variant="headingXl">
            {compliant}
          </Text>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="200">
          <Text as="p" variant="bodySm" tone="caution">
            Warnings
          </Text>
          <Text as="p" variant="headingXl">
            {warnings}
          </Text>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="200">
          <Text as="p" variant="bodySm" tone="critical">
            Violations
          </Text>
          <Text as="p" variant="headingXl">
            {violations}
          </Text>
        </BlockStack>
      </Card>
    </InlineGrid>
  );
}
