import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import ShopProduct from "./product";

const baseProduct = {
  id: 1,
  slug: "sample-journal",
  title: "Sample Journal",
  description: "A sample digital journal.",
  shortDescription: null,
  price: 12,
  currency: "EUR",
  type: "digital" as const,
  category: null,
  imageUrl: null,
  previewImageUrl: null,
  isFeatured: false,
  downloadUrl: null,
  preorderOpensAt: null,
  preorderClosesAt: null,
  estimatedFulfilment: null,
  regions: [],
  variants: [],
  externalPurchaseUrl: null,
  tags: [],
  createdAt: new Date().toISOString(),
};

const mockUseGetProduct = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useGetProduct: (...args: unknown[]) => mockUseGetProduct(...args),
  // Footer (rendered by every page via Layout) needs this too.
  useSubscribeNewsletter: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderProductPage() {
  return render(
    <Router base="">
      <ShopProduct />
    </Router>
  );
}

describe("ShopProduct — honesty of the purchase action", () => {
  it("never claims an item was added to a bag (no cart exists)", () => {
    mockUseGetProduct.mockReturnValue({
      data: { ...baseProduct, availability: "available" },
      isLoading: false,
      error: null,
    });

    renderProductPage();

    expect(screen.queryByText(/added to (your )?bag/i)).not.toBeInTheDocument();
  });

  it("offers an honest pre-order enquiry action for pre-order products, not a fake purchase", () => {
    mockUseGetProduct.mockReturnValue({
      data: { ...baseProduct, availability: "preorder", type: "physical" },
      isLoading: false,
      error: null,
    });

    renderProductPage();

    expect(screen.getByRole("link", { name: /join the pre-order list/i })).toBeInTheDocument();
    expect(screen.queryByText(/3-4 weeks/i)).not.toBeInTheDocument();
  });

  it("offers a coming-soon notify action instead of a purchase button when not orderable", () => {
    mockUseGetProduct.mockReturnValue({
      data: { ...baseProduct, availability: "coming_soon" },
      isLoading: false,
      error: null,
    });

    renderProductPage();

    expect(screen.getByText(/isn't orderable yet/i)).toBeInTheDocument();
  });
});
