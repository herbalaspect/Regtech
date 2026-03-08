import { BlockStack, Text } from "@shopify/polaris";
import type { ComplianceFinding } from "~/lib/types";
import { IssueCard } from "./IssueCard";

interface ScanResultsListProps {
  findings: ComplianceFinding[];
  emptyMessage?: string;
}

export function ScanResultsList({
  findings,
  emptyMessage = "No compliance issues found.",
}: ScanResultsListProps) {
  if (findings.length === 0) {
    return (
      <Text as="p" variant="bodyMd" tone="subdued">
        {emptyMessage}
      </Text>
    );
  }

  // Sort by severity: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sorted = [...findings].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return (
    <BlockStack gap="400">
      {sorted.map((finding, i) => (
        <IssueCard key={`${finding.ruleId}-${i}`} finding={finding} />
      ))}
    </BlockStack>
  );
}
