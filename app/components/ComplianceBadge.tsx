import { Badge } from "@shopify/polaris";
import type { ComplianceScore } from "~/lib/types";

interface ComplianceBadgeProps {
  score: ComplianceScore;
  size?: "small" | "medium" | "large";
}

const badgeConfig: Record<ComplianceScore, { tone: "success" | "warning" | "critical" | "info"; label: string }> = {
  GREEN: { tone: "success", label: "Compliant" },
  YELLOW: { tone: "warning", label: "Warnings" },
  RED: { tone: "critical", label: "Violations" },
  NOT_SCANNED: { tone: "info", label: "Not Scanned" },
};

export function ComplianceBadge({ score }: ComplianceBadgeProps) {
  const config = badgeConfig[score];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
