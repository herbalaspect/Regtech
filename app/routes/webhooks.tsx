import { createHmac, timingSafeEqual } from "crypto";
import type { ActionFunctionArgs } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { getShopByDomain, saveScanResult } from "~/services/db/scan-writer";
import { fetchProduct, generateContentHash } from "~/services/shopify/products";
import { scanProduct } from "~/services/compliance/engine";
import { DEFAULT_SHOP_SETTINGS } from "~/lib/types";
import shopify from "~/lib/shopify.server";

/**
 * Verify Shopify webhook HMAC signature.
 */
function verifyWebhookHmac(body: string, hmacHeader: string | null): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret || !hmacHeader) return false;

  const digest = createHmac("sha256", secret).update(body, "utf8").digest("base64");

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  } catch {
    return false;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  // Read body for HMAC verification
  const rawBody = await request.text();

  // Verify HMAC signature
  if (!verifyWebhookHmac(rawBody, hmacHeader)) {
    console.warn(`[Webhook] Invalid HMAC from ${shop}`);
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Process asynchronously — always return 200 quickly to Shopify
  void processWebhook(topic, shop, payload).catch((err) =>
    console.error(`[Webhook] Processing error for ${topic}:`, err),
  );

  return new Response("OK", { status: 200 });
}

async function processWebhook(
  topic: string | null,
  shopDomain: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!shopDomain) return;

  switch (topic) {
    case "products/create":
    case "products/update": {
      await handleProductChange(shopDomain, payload);
      break;
    }

    case "products/delete": {
      await handleProductDelete(shopDomain, payload);
      break;
    }

    case "app/uninstalled": {
      await handleAppUninstalled(shopDomain);
      break;
    }

    default:
      console.log(`[Webhook] Unhandled topic: ${topic}`);
  }
}

async function handleProductChange(
  shopDomain: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const dbShop = await getShopByDomain(shopDomain);
  if (!dbShop) {
    console.warn(`[Webhook] No shop found for ${shopDomain}`);
    return;
  }

  const settings = dbShop.settings
    ? { ...DEFAULT_SHOP_SETTINGS, ...JSON.parse(dbShop.settings) }
    : DEFAULT_SHOP_SETTINGS;

  // Only auto-scan if frequency allows
  if (settings.scanFrequency !== "on_change") return;

  // Build Shopify GID from payload ID
  const productNumericId = payload.id as number;
  const shopifyGid = `gid://shopify/Product/${productNumericId}`;

  // We need an authenticated admin client to fetch product details
  // For webhooks, we use the stored session
  const sessions = await db.session.findMany({
    where: { shop: shopDomain, isOnline: false },
  });

  if (sessions.length === 0) {
    console.warn(`[Webhook] No offline session found for ${shopDomain}`);
    return;
  }

  // Build a simple GraphQL fetch using the stored access token
  const session = sessions[0];
  const adminFetch = makeAdminFetch(shopDomain, session.accessToken);

  const productData = await fetchProduct(adminFetch, shopifyGid);
  if (!productData) {
    console.warn(`[Webhook] Could not fetch product ${shopifyGid}`);
    return;
  }

  const contentHash = generateContentHash(productData);

  // Check if content changed
  const existing = await db.product.findUnique({
    where: {
      shopId_shopifyId: { shopId: dbShop.id, shopifyId: shopifyGid },
    },
  });

  if (existing?.contentHash === contentHash) {
    // No change — skip
    return;
  }

  const planTier = (dbShop.plan || "compliance") as "compliance" | "compliance_pro" | "enterprise";
  const scanResult = await scanProduct(productData, settings, undefined, planTier);

  await saveScanResult(
    dbShop.id,
    {
      shopifyId: productData.shopifyId,
      title: productData.title,
      description: productData.description,
      bodyHtml: productData.bodyHtml,
      tags: productData.tags,
      productType: productData.productType,
      vendor: productData.vendor,
      imageUrls: productData.images.map((i) => i.url),
      contentHash,
    },
    scanResult,
    "webhook",
  );

  console.log(
    `[Webhook] Scanned ${productData.title}: ${scanResult.complianceScore} ` +
    `(${scanResult.findings.length} findings)`,
  );

  // Fire external webhook if configured and critical issues found
  const hasCritical = scanResult.findings.some((f) => f.severity === "critical");
  if (hasCritical && settings.externalWebhookUrl) {
    await fireExternalWebhook(settings.externalWebhookUrl, {
      shop: shopDomain,
      product: productData.title,
      complianceScore: scanResult.complianceScore,
      criticalCount: scanResult.findings.filter((f) => f.severity === "critical").length,
    });
  }
}

async function handleProductDelete(
  shopDomain: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const dbShop = await getShopByDomain(shopDomain);
  if (!dbShop) return;

  const productNumericId = payload.id as number;
  const shopifyGid = `gid://shopify/Product/${productNumericId}`;

  // Soft-delete the product
  await db.product.updateMany({
    where: { shopId: dbShop.id, shopifyId: shopifyGid },
    data: { deletedAt: new Date() },
  });

  console.log(`[Webhook] Soft-deleted product ${shopifyGid} for ${shopDomain}`);
}

async function handleAppUninstalled(shopDomain: string): Promise<void> {
  const dbShop = await getShopByDomain(shopDomain);
  if (!dbShop) return;

  // Cascade deletes products, findings, and scans
  await db.shop.delete({ where: { id: dbShop.id } });
  console.log(`[Webhook] Cleaned up data for uninstalled shop: ${shopDomain}`);
}

/**
 * Create a simple admin GraphQL fetch wrapper using stored access token.
 */
function makeAdminFetch(shop: string, accessToken: string) {
  return {
    graphql: async (query: string): Promise<Response> => {
      return fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({ query }),
      });
    },
  };
}

async function fireExternalWebhook(url: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error("[Webhook] Failed to fire external webhook:", err);
  }
}
