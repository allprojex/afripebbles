import type { ProductAvailability } from "@workspace/api-client-react";

export const AVAILABILITY_LABEL: Record<ProductAvailability, string> = {
  available: "Available",
  preorder: "Pre-order",
  coming_soon: "Coming Soon",
  out_of_stock: "Out of Stock",
};

export function isOrderable(availability: ProductAvailability): boolean {
  return availability === "available" || availability === "preorder";
}
