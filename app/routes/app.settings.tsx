import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import {
  BlockStack,
  Banner,
  Button,
  Card,
  Checkbox,
  Divider,
  FormLayout,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { useCallback, useState } from "react";
import { authenticate } from "~/lib/shopify.server";
import { db } from "~/lib/db.server";
import { getShopByDomain } from "~/services/db/scan-writer";
import { DEFAULT_SHOP_SETTINGS, PLAN_LIMITS, type PlanTier, type ShopSettings } from "~/lib/types";
import { UpgradeBanner } from "~/components/UpgradeBanner";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  const settings: ShopSettings = shop?.settings
    ? { ...DEFAULT_SHOP_SETTINGS, ...JSON.parse(shop.settings) }
    : DEFAULT_SHOP_SETTINGS;

  const planTier: PlanTier = (shop?.plan as PlanTier) || "compliance";

  return json({ settings, planTier });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shop = await getShopByDomain(session.shop);

  if (!shop) {
    return json({ success: false, error: "Shop not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const settingsJson = formData.get("settings") as string;

  try {
    const parsed = JSON.parse(settingsJson) as Partial<ShopSettings>;

    // Validate required fields
    if (parsed.notificationEmails) {
      const validEmails = parsed.notificationEmails.filter(
        (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
      );
      parsed.notificationEmails = validEmails;
    }

    if (parsed.externalWebhookUrl && parsed.externalWebhookUrl.length > 0) {
      try {
        new URL(parsed.externalWebhookUrl);
      } catch {
        return json({ success: false, error: "Invalid webhook URL" }, { status: 400 });
      }
    }

    const merged = { ...DEFAULT_SHOP_SETTINGS, ...parsed };

    await db.shop.update({
      where: { id: shop.id },
      data: { settings: JSON.stringify(merged) },
    });

    return json({ success: true });
  } catch {
    return json({ success: false, error: "Invalid settings format" }, { status: 400 });
  }
}

export default function SettingsPage() {
  const { settings: initialSettings, planTier } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [settings, setSettings] = useState<ShopSettings>(initialSettings);
  const submit = useSubmit();
  const limits = PLAN_LIMITS[planTier];

  const updateSettings = useCallback(
    (updates: Partial<ShopSettings>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  const updateScanScope = useCallback(
    (key: keyof ShopSettings["scanScope"], value: boolean) => {
      setSettings((prev) => ({
        ...prev,
        scanScope: { ...prev.scanScope, [key]: value },
      }));
    },
    [],
  );

  const handleSave = () => {
    const formData = new FormData();
    formData.set("settings", JSON.stringify(settings));
    submit(formData, { method: "post" });
  };

  return (
    <Page
      title="Settings"
      primaryAction={
        <Button variant="primary" onClick={handleSave}>
          Save Settings
        </Button>
      }
    >
      {actionData?.success && (
        <Banner tone="success" title="Settings saved" />
      )}
      {actionData && !actionData.success && "error" in actionData && (
        <Banner tone="critical" title={actionData.error as string} />
      )}

      <Layout>
        {/* Current Plan Info */}
        <Layout.AnnotatedSection
          title="Current Plan"
          description="Your active subscription plan."
        >
          <Card>
            <BlockStack gap="300">
              <Text as="p" variant="headingMd">
                {planTier === "compliance" && "Compliance — $79/mo"}
                {planTier === "compliance_pro" && "Compliance Pro — $199/mo"}
                {planTier === "enterprise" && "Enterprise — Custom"}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                {planTier === "compliance" && "Rule-based scanning for up to 100 products"}
                {planTier === "compliance_pro" && "AI-powered scanning for up to 1,000 products"}
                {planTier === "enterprise" && "Unlimited products with custom rules"}
              </Text>
              <Button url="/app/pricing">View Plans</Button>
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* Category Configuration */}
        <Layout.AnnotatedSection
          title="Product Categories"
          description="Select which regulatory categories to monitor."
        >
          <Card>
            <BlockStack gap="300">
              {(
                [
                  ["supplement", "Dietary Supplements & Nutraceuticals"],
                  ["hemp_cbd", "Hemp & CBD Products"],
                  ["cosmetic", "Cosmetics & Personal Care"],
                  ["otc_drug", "OTC Topical Drugs"],
                  ["essential_oil", "Essential Oils & Aromatherapy"],
                ] as const
              ).map(([key, label]) => (
                <Checkbox
                  key={key}
                  label={label}
                  checked={settings.enabledCategories.includes(key)}
                  onChange={(checked) => {
                    const cats = checked
                      ? [...settings.enabledCategories, key]
                      : settings.enabledCategories.filter((c) => c !== key);
                    updateSettings({ enabledCategories: cats });
                  }}
                />
              ))}
              <Divider />
              <Checkbox
                label="California Proposition 65 warnings"
                checked={settings.prop65Enabled}
                onChange={(v) => updateSettings({ prop65Enabled: v })}
              />
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* Scan Configuration */}
        <Layout.AnnotatedSection
          title="Scan Configuration"
          description="Control what gets scanned and how often."
        >
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">Scan Scope</Text>
              <BlockStack gap="200">
                <Checkbox
                  label="Product title"
                  checked={settings.scanScope.title}
                  onChange={(v) => updateScanScope("title", v)}
                />
                <Checkbox
                  label="Product description & body HTML"
                  checked={settings.scanScope.description}
                  onChange={(v) => updateScanScope("description", v)}
                />
                <Checkbox
                  label="Product tags"
                  checked={settings.scanScope.tags}
                  onChange={(v) => updateScanScope("tags", v)}
                />
                <Checkbox
                  label="Product metafields"
                  checked={settings.scanScope.metafields}
                  onChange={(v) => updateScanScope("metafields", v)}
                />
                <Checkbox
                  label="Product images (label/packaging OCR)"
                  checked={settings.scanScope.images}
                  onChange={(v) => updateScanScope("images", v)}
                />
              </BlockStack>

              <Divider />

              <FormLayout>
                <Select
                  label="Scan frequency"
                  options={[
                    { label: "Manual only", value: "manual" },
                    { label: "On product change (webhook)", value: "on_change" },
                    ...(limits.scheduledScans
                      ? [
                          { label: "Daily", value: "daily" },
                          { label: "Weekly", value: "weekly" },
                        ]
                      : []),
                  ]}
                  value={settings.scanFrequency}
                  onChange={(v) =>
                    updateSettings({
                      scanFrequency: v as ShopSettings["scanFrequency"],
                    })
                  }
                />
                {!limits.scheduledScans && (
                  <UpgradeBanner currentPlan={planTier} feature="Scheduled scans" />
                )}

                <Checkbox
                  label={
                    limits.aiTextAnalysis
                      ? "Enable AI text analysis (Claude)"
                      : "Enable AI text analysis (Claude) — Requires Pro plan"
                  }
                  helpText="Uses Claude to detect nuanced claims that keyword rules might miss."
                  checked={limits.aiTextAnalysis && settings.aiTextAnalysis}
                  disabled={!limits.aiTextAnalysis}
                  onChange={(v) => updateSettings({ aiTextAnalysis: v })}
                />

                <Checkbox
                  label={
                    limits.imageScanning
                      ? "Enable image scanning (Claude Vision)"
                      : "Enable image scanning (Claude Vision) — Requires Pro plan"
                  }
                  helpText="Analyzes product images for label compliance, claims on packaging, and label-vs-listing discrepancies."
                  checked={limits.imageScanning && settings.imageScanning}
                  disabled={!limits.imageScanning}
                  onChange={(v) => updateSettings({ imageScanning: v })}
                />
                {!limits.aiTextAnalysis && (
                  <UpgradeBanner currentPlan={planTier} feature="AI analysis features" />
                )}
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.AnnotatedSection>

        {/* Notifications */}
        <Layout.AnnotatedSection
          title="Notifications"
          description="Configure how you receive compliance alerts."
        >
          <Card>
            <FormLayout>
              <TextField
                label="Notification email(s)"
                helpText="Comma-separated list of email addresses"
                value={settings.notificationEmails.join(", ")}
                onChange={(v) =>
                  updateSettings({
                    notificationEmails: v
                      .split(",")
                      .map((e) => e.trim())
                      .filter(Boolean),
                  })
                }
                autoComplete="off"
              />

              <Select
                label="Notification level"
                options={[
                  { label: "Critical issues only", value: "critical_only" },
                  { label: "All issues", value: "all" },
                  { label: "Digest summary", value: "digest" },
                ]}
                value={settings.notificationLevel}
                onChange={(v) =>
                  updateSettings({
                    notificationLevel: v as ShopSettings["notificationLevel"],
                  })
                }
              />

              <Select
                label="Digest frequency"
                options={[
                  { label: "Daily", value: "daily" },
                  { label: "Weekly", value: "weekly" },
                ]}
                value={settings.digestFrequency}
                onChange={(v) =>
                  updateSettings({
                    digestFrequency: v as ShopSettings["digestFrequency"],
                  })
                }
              />
            </FormLayout>
          </Card>
        </Layout.AnnotatedSection>

        {/* Data & Export */}
        <Layout.AnnotatedSection
          title="Data & Export"
          description="Manage scan history and compliance reports."
        >
          <Card>
            <FormLayout>
              <Select
                label="Scan history retention"
                options={[
                  { label: "30 days", value: "30" },
                  { label: "90 days", value: "90" },
                  { label: "1 year", value: "365" },
                ]}
                value={String(settings.retentionDays)}
                onChange={(v) =>
                  updateSettings({
                    retentionDays: parseInt(v) as ShopSettings["retentionDays"],
                  })
                }
              />

              <Checkbox
                label={
                  limits.storefrontBadge
                    ? "Enable storefront compliance badge"
                    : "Enable storefront compliance badge — Requires Pro plan"
                }
                helpText="Display a compliance badge on product pages for compliant products."
                checked={limits.storefrontBadge && settings.storefrontBadgeEnabled}
                disabled={!limits.storefrontBadge}
                onChange={(v) => updateSettings({ storefrontBadgeEnabled: v })}
              />
            </FormLayout>
          </Card>
        </Layout.AnnotatedSection>

        {/* Integrations */}
        <Layout.AnnotatedSection
          title="Integrations"
          description="Connect with external systems."
        >
          <Card>
            <FormLayout>
              <TextField
                label={
                  limits.externalWebhook
                    ? "External webhook URL"
                    : "External webhook URL — Requires Pro plan"
                }
                helpText="Receive POST notifications when critical compliance issues are found."
                value={settings.externalWebhookUrl || ""}
                onChange={(v) => updateSettings({ externalWebhookUrl: v })}
                type="url"
                autoComplete="off"
                disabled={!limits.externalWebhook}
              />
              {!limits.externalWebhook && (
                <UpgradeBanner currentPlan={planTier} feature="External webhooks" />
              )}
            </FormLayout>
          </Card>
        </Layout.AnnotatedSection>
      </Layout>
    </Page>
  );
}
