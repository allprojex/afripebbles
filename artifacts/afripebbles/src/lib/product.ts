import type { ProductAvailability } from "@workspace/api-client-react";
import type { SyntheticEvent } from "react";

// Neutral gray square, inlined so the fallback itself can never fail to load.
export const IMAGE_FALLBACK_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5' viewBox='0 0 4 5'%3E%3Crect width='4' height='5' fill='%23e7e2da'/%3E%3C/svg%3E";

/**
 * Swaps a broken/failed <img> to a neutral placeholder instead of leaving
 * broken-image chrome or blank space. Clears its own handler first so a
 * failing placeholder (it can't — it's a data URI) could never loop.
 */
export function handleImageError(e: SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = IMAGE_FALLBACK_SRC;
}

export const AVAILABILITY_LABEL: Record<ProductAvailability, string> = {
  available: "Available",
  preorder: "Pre-order",
  coming_soon: "Coming Soon",
  out_of_stock: "Out of Stock",
};

export function isOrderable(availability: ProductAvailability): boolean {
  return availability === "available" || availability === "preorder";
}

/**
 * Structural subsets of the generated ProductImage/ProductVariety shapes — the
 * helpers below only ever need these fields, and taking them structurally keeps
 * them callable from anywhere (and testable with plain objects).
 */
export interface VarietyImageLike {
  url: string;
  thumbnailUrl?: string | null;
  isFeatured?: boolean;
}

export interface VarietyLike {
  images: VarietyImageLike[];
}

/**
 * The one image that represents a variety: its explicitly featured image, else
 * the first one it has. Generic so callers passing the full generated
 * ProductImage get it back intact (altText and all) rather than the subset above.
 */
export function primaryVarietyImage<T extends VarietyImageLike>(variety: { images: T[] } | null | undefined): T | null {
  if (!variety) return null;
  return variety.images.find((img) => img.isFeatured) ?? variety.images[0] ?? null;
}

/**
 * Image a cart line should display. A pictured variety always wins over the
 * product's own featured image — otherwise a "Green & Gold" line renders the
 * red product photo, which is what the customer did not choose. Cart rows draw
 * at ~64px so the small derivative is preferred; `url` covers varieties whose
 * images pre-date the thumbnail pipeline, and the product image covers
 * varieties with no image at all (and products with no varieties, which pass
 * `variety` as null and are therefore left exactly as they were).
 */
export function cartLineImageUrl(variety: VarietyLike | null | undefined, productImageUrl: string | null): string | null {
  const image = primaryVarietyImage(variety);
  return image?.thumbnailUrl ?? image?.url ?? productImageUrl;
}
