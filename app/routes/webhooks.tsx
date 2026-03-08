import type { ActionFunctionArgs } from "@remix-run/node";

/**
 * Shopify webhook handler endpoint.
 *
 * In production, this would:
 * 1. Verify webhook HMAC signature
 * 2. Parse the webhook topic from headers
 * 3. Route to appropriate handler
 * 4. Return 200 quickly, process async
 */
export async function action({ request }: ActionFunctionArgs) {
  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  console.log(`[Webhook] Received ${topic} from ${shop}`);

  switch (topic) {
    case "products/create":
    case "products/update": {
      const payload = await request.json();
      // In production:
      // 1. Look up shop settings from DB
      // 2. Convert payload to ProductData
      // 3. Run compliance scan
      // 4. Save results to DB
      // 5. Send notifications if critical issues found
      console.log(`[Webhook] Product ${payload.id} ${topic === "products/create" ? "created" : "updated"}`);
      break;
    }

    case "app/uninstalled": {
      // Clean up shop data
      console.log(`[Webhook] App uninstalled from ${shop}`);
      break;
    }

    default:
      console.log(`[Webhook] Unhandled topic: ${topic}`);
  }

  return new Response("OK", { status: 200 });
}
