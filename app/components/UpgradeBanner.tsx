import { Banner, Button } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import type { PlanTier } from "~/lib/types";

interface UpgradeBannerProps {
  currentPlan: PlanTier;
  feature: string;
  description?: string;
}

export function UpgradeBanner({ currentPlan, feature, description }: UpgradeBannerProps) {
  const navigate = useNavigate();

  const defaultDescription =
    currentPlan === "compliance"
      ? `Upgrade to Compliance Pro to unlock ${feature}.`
      : `Upgrade to Enterprise to unlock ${feature}.`;

  return (
    <Banner
      tone="warning"
      title={`${feature} requires a higher plan`}
      action={{
        content: "View Plans",
        onAction: () => navigate("/app/pricing"),
      }}
    >
      <p>{description || defaultDescription}</p>
    </Banner>
  );
}
