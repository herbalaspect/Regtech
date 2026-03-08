import type { ProductData, ProductImage } from "~/lib/types";

/**
 * Fetch all products from a Shopify store via Admin GraphQL API.
 */
export async function fetchAllProducts(
  admin: { graphql: (query: string) => Promise<Response> },
): Promise<ProductData[]> {
  const products: ProductData[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const response = await admin.graphql(`
      {
        products(first: 50${afterClause}) {
          edges {
            cursor
            node {
              id
              title
              description
              bodyHtml
              productType
              vendor
              tags
              images(first: 10) {
                edges {
                  node {
                    id
                    url
                    altText
                  }
                }
              }
              metafields(first: 20) {
                edges {
                  node {
                    namespace
                    key
                    value
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `);

    const json = await response.json();
    const data = json.data?.products;

    if (!data) break;

    for (const edge of data.edges) {
      const node = edge.node;
      products.push(mapGraphQLProduct(node));
      cursor = edge.cursor;
    }

    hasNextPage = data.pageInfo.hasNextPage;
  }

  return products;
}

/**
 * Fetch a single product by Shopify GID.
 */
export async function fetchProduct(
  admin: { graphql: (query: string) => Promise<Response> },
  shopifyId: string,
): Promise<ProductData | null> {
  const response = await admin.graphql(`
    {
      product(id: "${shopifyId}") {
        id
        title
        description
        bodyHtml
        productType
        vendor
        tags
        images(first: 10) {
          edges {
            node {
              id
              url
              altText
            }
          }
        }
        metafields(first: 20) {
          edges {
            node {
              namespace
              key
              value
            }
          }
        }
      }
    }
  `);

  const json = await response.json();
  const node = json.data?.product;
  if (!node) return null;

  return mapGraphQLProduct(node);
}

/**
 * Map a Shopify GraphQL product node to our ProductData shape.
 */
function mapGraphQLProduct(node: Record<string, unknown>): ProductData {
  const images: ProductImage[] = (
    (node.images as { edges: Array<{ node: { id: string; url: string; altText: string | null } }> })?.edges || []
  ).map((e) => ({
    id: e.node.id,
    url: e.node.url,
    altText: e.node.altText,
  }));

  const metafields: Record<string, string> = {};
  const metafieldEdges = (
    node.metafields as { edges: Array<{ node: { namespace: string; key: string; value: string } }> }
  )?.edges || [];
  for (const edge of metafieldEdges) {
    metafields[`${edge.node.namespace}.${edge.node.key}`] = edge.node.value;
  }

  return {
    id: extractNumericId(node.id as string),
    shopifyId: node.id as string,
    title: node.title as string,
    description: node.description as string || "",
    bodyHtml: node.bodyHtml as string || "",
    tags: Array.isArray(node.tags) ? node.tags : [],
    productType: node.productType as string || "",
    vendor: node.vendor as string || "",
    images,
    metafields,
  };
}

function extractNumericId(gid: string): string {
  const parts = gid.split("/");
  return parts[parts.length - 1];
}

/**
 * Generate a content hash for change detection.
 */
export function generateContentHash(product: ProductData): string {
  const content = [
    product.title,
    product.description,
    product.bodyHtml,
    product.tags.join(","),
    product.productType,
    JSON.stringify(product.metafields),
    product.images.map((i) => i.url).join(","),
  ].join("|");

  // Simple hash for change detection
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
}
