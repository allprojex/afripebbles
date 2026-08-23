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

  it("stages multiple variety+option combinations and adds them all as distinct cart lines in one action", async () => {
    const user = userEvent.setup();
    mockUseGetProduct.mockReturnValue({
      data: {
        ...baseProduct,
        availability: "available",
        type: "physical",
        optionGroups: [
          {
            id: 1,
            productId: 1,
            key: "size",
            label: "Size",
            displayOrder: 0,
            required: true,
            helpText: null,
            isActive: true,
            values: [
              { id: 10, groupId: 1, label: "Large", value: "l", displayOrder: 0, priceAdjustment: 5, sku: null, imageUrl: null, description: null, isActive: true },
              { id: 11, groupId: 1, label: "Medium", value: "m", displayOrder: 1, priceAdjustment: 0, sku: null, imageUrl: null, description: null, isActive: true },
            ],
          },
        ],
        varieties: [
          { id: 100, productId: 1, name: "Burgundy", description: null, sku: null, priceOverride: 25, shippingAmountOverride: null, availabilityOverride: null, displayOrder: 0, isActive: true, images: [] },
          { id: 101, productId: 1, name: "White", description: null, sku: null, priceOverride: 22, shippingAmountOverride: null, availabilityOverride: null, displayOrder: 1, isActive: true, images: [] },
        ],
        gallery: [],
      },
      isLoading: false,
      error: null,
    });

    renderProductPage();

    // First combination: Burgundy / Large.
    await user.click(screen.getByRole("button", { name: /burgundy/i }));
    await user.click(screen.getByRole("button", { name: /^large/i }));
    await user.click(screen.getByRole("button", { name: /add selection/i }));

    // Second combination: White / Medium.
    await user.click(screen.getByRole("button", { name: /white/i }));
    await user.click(screen.getByRole("button", { name: /^medium/i }));
    await user.click(screen.getByRole("button", { name: /add selection/i }));

    expect(screen.getAllByText("Burgundy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("White").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /add all to cart/i }));
    await screen.findAllByLabelText("Cart (2 items)");
  });

  it("keeps the plain Add to Cart flow for a product with no option groups or varieties (no staging step)", () => {
    mockUseGetProduct.mockReturnValue({
      data: { ...baseProduct, availability: "available", optionGroups: [], varieties: [], gallery: [] },
      isLoading: false,
      error: null,
    });

    renderProductPage();
    expect(screen.getByRole("button", { name: /^add to cart$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add selection/i })).not.toBeInTheDocument();
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
