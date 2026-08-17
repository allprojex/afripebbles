import type { Product } from "@workspace/db";

/**
 * Strips the private digital-file location before a product ever reaches a
 * public response. Uses explicit destructuring (not reliance on Zod
 * silently dropping unknown keys) so this holds even if response schema
 * strictness ever changes. hasDownload signals downloadability without
 * exposing where the file lives — the hook for a future signed/time-limited
 * delivery flow.
 */
export function toPublicProduct(product: Product) {
  const { downloadUrl, ...rest } = product;
  return { ...rest, hasDownload: Boolean(downloadUrl) };
}
