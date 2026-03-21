import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import type { LinksFunction } from "@remix-run/node";
import { authenticate } from "~/lib/shopify.server";
import { upsertShop } from "~/services/db/scan-writer";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  // Ensure shop record exists in our DB
  await upsertShop(session.shop);

  // Don't expose the API key — Shopify App Bridge injects it for embedded apps
  return json({ apiKey: "" });
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Dashboard</Link>
        <Link to="/app/products">Products</Link>
        <Link to="/app/scan">Scan</Link>
        <Link to="/app/state-compliance">State Compliance</Link>
        <Link to="/app/pricing">Pricing</Link>
        <Link to="/app/settings">Settings</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Something went wrong</h1>
      <pre>{error instanceof Error ? error.message : "Unknown error"}</pre>
    </div>
  );
}
