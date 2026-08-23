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
