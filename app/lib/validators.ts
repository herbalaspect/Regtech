import { z } from "zod";

// ── Product Categories ────────────────────────────────────────────
const productCategorySchema = z.enum([
  "supplement",
  "hemp_cbd",
  "cosmetic",
  "otc_drug",
  "essential_oil",
]);

// ── Shop Settings Schema ──────────────────────────────────────────
export const ShopSettingsSchema = z.object({
  enabledCategories: z.array(productCategorySchema).min(0).max(5),

  scanScope: z.object({
    title: z.boolean(),
    description: z.boolean(),
    metafields: z.boolean(),
    tags: z.boolean(),
    images: z.boolean(),
  }),

  aiTextAnalysis: z.boolean(),
  imageScanning: z.boolean(),
  prop65Enabled: z.boolean(),

  scanFrequency: z.enum(["manual", "on_change", "daily", "weekly"]),

  notificationEmails: z.array(
    z.string().email("Invalid email address"),
  ),
  notificationLevel: z.enum(["critical_only", "all", "digest"]),
  digestFrequency: z.enum(["daily", "weekly"]),

  retentionDays: z.union([z.literal(30), z.literal(90), z.literal(365)]),

  externalWebhookUrl: z
    .string()
    .url("Invalid webhook URL")
    .optional()
    .or(z.literal("")),
  storefrontBadgeEnabled: z.boolean(),

  stateComplianceEnabled: z.boolean(),
  targetStates: z.array(z.string().length(2, "State code must be 2 characters")),
});

export type ValidatedShopSettings = z.infer<typeof ShopSettingsSchema>;

// ── Webhook Payload Schema ────────────────────────────────────────
export const WebhookPayloadSchema = z.object({
  id: z.union([z.number(), z.string()]),
}).passthrough();

/**
 * Validate and parse shop settings, returning field-level errors if invalid.
 */
export function validateShopSettings(data: unknown): {
  success: true;
  data: ValidatedShopSettings;
} | {
  success: false;
  errors: Record<string, string>;
} {
  const result = ShopSettingsSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  }

  return { success: false, errors };
}
