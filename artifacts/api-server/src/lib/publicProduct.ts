import type { Product } from "@workspace/db";
import type { ComposedProductChildren } from "./productComposition";

/**
 * Strips the private digital-file location before a product ever reaches a
 * public response. Uses explicit destructuring (not reliance on Zod
 * silently dropping unknown keys) so this holds even if response schema
 * strictness ever changes. hasDownload signals downloadability without
 * exposing where the file lives — the hook for a future signed/time-limited
 * delivery flow.
 */
export function toPublicProduct(product: Product) {
  const { downloadUrl, digitalDownloadPath, ...rest } = product;
  return { ...rest, hasDownload: Boolean(downloadUrl) };
}

/**
 * Filters a product's option groups/values/varieties down to active-only
 * before they ever reach a public response — draft/disabled groups, values,
 * and varieties an admin is still configuring must never appear on the
 * storefront. Rows are already sorted by displayOrder by loadProductChildren.
 */
export function toPublicProductChildren(children: ComposedProductChildren): ComposedProductChildren {
  return {
    optionGroups: children.optionGroups
      .filter((g) => g.isActive)
      .map((g) => ({ ...g, values: g.values.filter((v) => v.isActive) })),
    varieties: children.varieties.filter((v) => v.isActive),
    gallery: children.gallery,
  };
}
