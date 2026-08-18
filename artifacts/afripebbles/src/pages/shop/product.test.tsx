import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { CartProvider } from "@/lib/cart";
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
  // Footer and Seo (rendered by every page via Layout) need these too.
  useSubscribeNewsletter: () => ({ mutate: vi.fn(), isPending: false }),
  useGetSiteSettings: () => ({ data: null }),
}));

function renderProductPage() {
  return render(
    <Router base="">
      <CartProvider>
        <ShopProduct />
      </CartProvider>
    </Router>
  );
}

describe("ShopProduct — real cart, no fake purchase states", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds an available product to the cart via a real Add to Cart action", async () => {
    const user = userEvent.setup();
    mockUseGetProduct.mockReturnValue({
      data: { ...baseProduct, availability: "available" },
      isLoading: false,
      error: null,
    });

    renderProductPage();

    expect(screen.getAllByLabelText("Cart (0 items)").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /add to cart/i }));
    await screen.findAllByLabelText("Cart (1 items)");
  });

  it("allows adding a preorder item to the cart when no window restricts it, with no fake immediate-purchase claim", async () => {
    const user = userEvent.setup();
    mockUseGetProduct.mockReturnValue({
      data: { ...baseProduct, availability: "preorder", type: "physical" },
      isLoading: false,
      error: null,
    });

    renderProductPage();

    const button = screen.getByRole("button", { name: /add pre-order to cart/i });
    expect(button).toBeEnabled();
    await user.click(button);
    await screen.findAllByLabelText("Cart (1 items)");
  });

  it("disables adding a preorder item to the cart once its preorder window has closed", () => {
    mockUseGetProduct.mockReturnValue({
      data: { ...baseProduct, availability: "preorder", preorderClosesAt: new Date(Date.now() - 86_400_000).toISOString() },
      isLoading: false,
      error: null,
    });

    renderProductPage();
    expect(screen.getByRole("button", { name: /add pre-order to cart/i })).toBeDisabled();
    expect(screen.getByText(/pre-orders aren't open right now/i)).toBeInTheDocument();
  });

  it("requires a variant selection before a variant product can be added to the cart", async () => {
    const user = userEvent.setup();
    mockUseGetProduct.mockReturnValue({
      data: { ...baseProduct, availability: "available", type: "physical", variants: [{ label: "Size", options: ["S", "M"] }] },
      isLoading: false,
      error: null,
    });

    renderProductPage();

    const addButton = screen.getByRole("button", { name: /add to cart/i });
    expect(addButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "M" }));
    expect(addButton).toBeEnabled();
  });

  it("offers a coming-soon notify action instead of a purchase button when not orderable", () => {
    mockUseGetProduct.mockReturnValue({
      data: { ...baseProduct, availability: "coming_soon" },
      isLoading: false,
      error: null,
    });

    renderProductPage();

    expect(screen.getByRole("link", { name: /notify me when available/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add to cart/i })).not.toBeInTheDocument();
  });

  it("respects an external purchase URL instead of adding to the internal cart", () => {
    mockUseGetProduct.mockReturnValue({
      data: { ...baseProduct, availability: "available", externalPurchaseUrl: "https://example.com/buy" },
      isLoading: false,
      error: null,
    });

    renderProductPage();

    expect(screen.getByRole("link", { name: /purchase/i })).toHaveAttribute("href", "https://example.com/buy");
    expect(screen.queryByRole("button", { name: /add to cart/i })).not.toBeInTheDocument();
  });
});
