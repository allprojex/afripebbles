import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { CartProvider } from "@/lib/cart";
import ShopListing from "./index";

const mockUseListProducts = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useListProducts: (...args: unknown[]) => mockUseListProducts(...args),
  // Footer (rendered by every page via Layout) needs these too.
  useSubscribeNewsletter: () => ({ mutate: vi.fn(), isPending: false }),
  useGetSiteSettings: () => ({ data: null }),
}));

const baseProduct = {
  id: 1,
  title: "Sample Product",
  description: "A sample product.",
  price: 12,
  currency: "EUR",
  type: "physical" as const,
  availability: "available" as const,
  imageUrl: "https://example.supabase.co/storage/v1/object/public/product-images/abc.webp",
  thumbnailUrl: null as string | null,
};

function renderShop() {
  return render(
    <Router base="">
      <CartProvider>
        <ShopListing />
      </CartProvider>
    </Router>,
  );
}

describe("ShopListing grid — image sizing", () => {
  it("uses the small thumbnail derivative on the grid card when one is available", () => {
    mockUseListProducts.mockReturnValue({
      data: [{ ...baseProduct, thumbnailUrl: "https://example.supabase.co/storage/v1/object/public/product-images/abc-thumb.webp" }],
      isLoading: false,
    });
    renderShop();

    const img = screen.getByAltText("Sample Product") as HTMLImageElement;
    expect(img.src).toContain("abc-thumb.webp");
  });

  it("falls back to the full display image when no thumbnail derivative exists (pre-pipeline product)", () => {
    mockUseListProducts.mockReturnValue({ data: [{ ...baseProduct, thumbnailUrl: null }], isLoading: false });
    renderShop();

    const img = screen.getByAltText("Sample Product") as HTMLImageElement;
    expect(img.src).toContain("abc.webp");
    expect(img.src).not.toContain("thumb");
  });

  it("lazy-loads grid card images so only visible cards are fetched immediately", () => {
    mockUseListProducts.mockReturnValue({ data: [baseProduct], isLoading: false });
    renderShop();

    const img = screen.getByAltText("Sample Product");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("swaps a failed grid image to the neutral placeholder instead of leaving it broken", () => {
    mockUseListProducts.mockReturnValue({ data: [baseProduct], isLoading: false });
    renderShop();

    const img = screen.getByAltText("Sample Product") as HTMLImageElement;
    img.dispatchEvent(new Event("error"));
    expect(img.src).toContain("data:image/svg+xml");
  });
});
