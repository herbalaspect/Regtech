import type { ShopSettings } from "~/lib/types";
import { fetchProduct } from "./products";
import { scanProduct } from "../compliance/engine";
import { DEFAULT_SHOP_SETTINGS } from "~/lib/types";

/**
 * Handle product create/update webhook.
 * Triggers an auto-scan if settings allow.
 */
export async function handleProductWebhook(
  admin: { graphql: (query: string) => Promise<Response> },
  shopifyProductId: string,
  shopSettings: ShopSettings = DEFAULT_SHOP_SETTINGS,
): Promise<void> {
  // Only auto-scan if frequency is "on_change"
  if (shopSettings.scanFrequency !== "on_change") return;

  const product = await fetchProduct(admin, shopifyProductId);
  if (!product) return;

  const result = await scanProduct(product, shopSettings);

  // Log result for now — in production this would update the DB
  console.log(
    `[Webhook] Scanned product ${product.title}: ${result.complianceScore} ` +
    `(${result.findings.length} findings)`,
  );
}

/**
 * Handle app uninstall webhook.
 * Cleans up shop data.
 */
export async function handleAppUninstalled(shopDomain: string): Promise<void> {
  // In production: delete shop data from DB
  console.log(`[Webhook] App uninstalled from ${shopDomain}`);
}
