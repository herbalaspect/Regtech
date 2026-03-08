import {
  BlockStack,
  Box,
  Card,
  Icon,
  InlineStack,
  Text,
} from "@shopify/polaris";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
} from "@shopify/polaris-icons";
import type { ComplianceFinding } from "~/lib/types";

interface IssueCardProps {
  finding: ComplianceFinding;
}

const severityConfig = {
  critical: {
    icon: AlertCircleIcon,
    tone: "critical" as const,
    label: "Critical",
  },
  warning: {
    icon: AlertTriangleIcon,
    tone: "caution" as const,
    label: "Warning",
  },
  info: {
    icon: InfoIcon,
    tone: "info" as const,
    label: "Info",
  },
};

const sourceLabels: Record<string, string> = {
  rule_engine: "Rule Engine",
  ai_text: "AI Analysis",
  ai_image: "Image Scan",
};

export function IssueCard({ finding }: IssueCardProps) {
  const config = severityConfig[finding.severity];

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Icon source={config.icon} tone={config.tone} />
            <Text as="h3" variant="headingSm" fontWeight="semibold">
              {finding.title}
            </Text>
          </InlineStack>
          <Text as="span" variant="bodySm" tone="subdued">
            {sourceLabels[finding.source] || finding.source}
          </Text>
        </InlineStack>

        <Text as="p" variant="bodyMd">
          {finding.description}
        </Text>

        {finding.affectedText && (
          <Box
            background="bg-surface-secondary"
            padding="300"
            borderRadius="200"
          >
            <Text as="p" variant="bodySm" tone="subdued">
              Affected text:
            </Text>
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              {finding.affectedText}
            </Text>
          </Box>
        )}

        {finding.suggestion && (
          <Box
            background="bg-surface-success"
            padding="300"
            borderRadius="200"
          >
            <Text as="p" variant="bodySm" tone="success">
              Suggested fix:
            </Text>
            <Text as="p" variant="bodyMd">
              {finding.suggestion}
            </Text>
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}
