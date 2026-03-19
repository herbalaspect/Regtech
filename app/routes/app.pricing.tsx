import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate } from "~/lib/shopify.server";
import { getShopByDomain } from "~/services/db/scan-writer";
import { PLAN_DEFINITIONS } from "~/lib/constants";
import type { PlanTier } from "~/lib/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);
  const currentPlan: PlanTier = (shop?.plan as PlanTier) || "compliance";
  return json({ currentPlan });
}

export default function PricingPage() {
  const { currentPlan } = useLoaderData<typeof loader>();

  return (
    <Page title="Pricing Plans" backAction={{ url: "/app" }}>
      <BlockStack gap="600">
        <Text as="p" variant="bodyLg">
          Choose the plan that fits your compliance needs. All plans include our
          40+ rule engine across 5 regulatory categories.
        </Text>

        <InlineGrid columns={{ xs: 1, sm: 1, lg: 3 }} gap="400">
          {PLAN_DEFINITIONS.map((plan) => {
            const isCurrent = currentPlan === plan.tier;
            const isUpgrade =
              (currentPlan === "compliance" && plan.tier !== "compliance") ||
              (currentPlan === "compliance_pro" && plan.tier === "enterprise");

            return (
              <Card key={plan.tier}>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingLg">
                      {plan.name}
                    </Text>
                    {isCurrent && <Badge tone="success">Current Plan</Badge>}
                  </InlineStack>

                  <BlockStack gap="100">
                    <Text as="p" variant="headingXl">
                      {plan.price ? `$${plan.price}` : "Custom"}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {plan.price ? `per ${plan.pricePeriod}` : "Contact us for pricing"}
                    </Text>
                  </BlockStack>

                  <Text as="p" variant="bodyMd">
                    {plan.description}
                  </Text>

                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      Included
                    </Text>
                    {plan.features.map((feature, i) => (
                      <Text key={i} as="p" variant="bodySm">
                        ✓ {feature}
                      </Text>
                    ))}
                  </BlockStack>

                  {plan.notIncluded.length > 0 && (
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">
                        Not included
                      </Text>
                      {plan.notIncluded.map((feature, i) => (
                        <Text key={i} as="p" variant="bodySm" tone="subdued">
                          — {feature}
                        </Text>
                      ))}
                    </BlockStack>
                  )}

                  {isCurrent ? (
                    <Button disabled>Current Plan</Button>
                  ) : isUpgrade ? (
                    <Button variant="primary">
                      {plan.price ? `Upgrade to ${plan.name}` : "Contact Sales"}
                    </Button>
                  ) : (
                    <Button>Downgrade</Button>
                  )}
                </BlockStack>
              </Card>
            );
          })}
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}
