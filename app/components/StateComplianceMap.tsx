import {
  Badge,
  BlockStack,
  Card,
  DataTable,
  InlineStack,
  Text,
} from "@shopify/polaris";

interface StateResult {
  stateCode: string;
  stateName: string;
  compliant: boolean;
  issueCount: number;
  criticalCount: number;
  warningCount: number;
}

interface StateComplianceMapProps {
  results: StateResult[];
  onStateClick?: (stateCode: string) => void;
}

export function StateComplianceMap({ results, onStateClick }: StateComplianceMapProps) {
  const compliantCount = results.filter((r) => r.compliant).length;
  const nonCompliantCount = results.filter((r) => !r.compliant).length;

  const rows = results
    .sort((a, b) => {
      // Non-compliant first, then by critical count desc
      if (a.compliant !== b.compliant) return a.compliant ? 1 : -1;
      if (a.criticalCount !== b.criticalCount) return b.criticalCount - a.criticalCount;
      return a.stateName.localeCompare(b.stateName);
    })
    .map((r) => [
      r.stateCode,
      r.stateName,
      r.compliant ? "Compliant" : "Non-Compliant",
      r.criticalCount,
      r.warningCount,
      r.issueCount,
    ]);

  return (
    <BlockStack gap="400">
      <InlineStack gap="400">
        <Card>
          <BlockStack gap="100">
            <Text as="p" variant="bodySm" tone="success">Compliant States</Text>
            <Text as="p" variant="headingLg">{compliantCount}</Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="100">
            <Text as="p" variant="bodySm" tone="critical">Non-Compliant States</Text>
            <Text as="p" variant="headingLg">{nonCompliantCount}</Text>
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="100">
            <Text as="p" variant="bodySm" tone="subdued">Total States Checked</Text>
            <Text as="p" variant="headingLg">{results.length}</Text>
          </BlockStack>
        </Card>
      </InlineStack>

      <Card>
        <DataTable
          columnContentTypes={["text", "text", "text", "numeric", "numeric", "numeric"]}
          headings={["State", "Name", "Status", "Critical", "Warnings", "Total Issues"]}
          rows={rows}
          sortable={[true, true, true, true, true, true]}
        />
      </Card>
    </BlockStack>
  );
}

export function StateComplianceBadge({ compliant }: { compliant: boolean }) {
  return compliant ? (
    <Badge tone="success">Compliant</Badge>
  ) : (
    <Badge tone="critical">Non-Compliant</Badge>
  );
}
