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

  it("uses each variety's thumbnail derivative for its style card, falling back to the full image when no thumbnail exists", () => {
    mockUseGetProduct.mockReturnValue({
      data: {
        ...baseProduct,
        availability: "available",
        type: "physical",
        optionGroups: [],
        varieties: [
          {
            id: 100,
            productId: 1,
            name: "Burgundy",
            description: null,
            sku: null,
            priceOverride: null,
            shippingAmountOverride: null,
            availabilityOverride: null,
            displayOrder: 0,
            isActive: true,
            images: [
              { id: 1, productId: 1, varietyId: 100, url: "https://cdn.test/burgundy.webp", thumbnailUrl: "https://cdn.test/burgundy-thumb.webp", altText: null, caption: null, displayOrder: 0, isFeatured: true },
            ],
          },
          {
            id: 101,
            productId: 1,
            name: "White",
            description: null,
            sku: null,
            priceOverride: null,
            shippingAmountOverride: null,
            availabilityOverride: null,
            displayOrder: 1,
            isActive: true,
            images: [
              { id: 2, productId: 1, varietyId: 101, url: "https://cdn.test/white.png", thumbnailUrl: null, altText: null, caption: null, displayOrder: 0, isFeatured: true },
            ],
          },
        ],
        gallery: [],
      },
      isLoading: false,
      error: null,
    });

    renderProductPage();

    const burgundyImg = screen.getByAltText("Burgundy") as HTMLImageElement;
    expect(burgundyImg.src).toBe("https://cdn.test/burgundy-thumb.webp");

    const whiteImg = screen.getByAltText("White") as HTMLImageElement;
    expect(whiteImg.src).toBe("https://cdn.test/white.png");
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

describe("ShopProduct — cart line image follows the selected variety", () => {
  const image = (over: Partial<{ id: number; url: string; thumbnailUrl: string | null }>) => ({
    id: 1,
    productId: 1,
    varietyId: 100,
    url: "https://cdn.test/x.webp",
    thumbnailUrl: null,
    altText: null,
    caption: null,
    displayOrder: 0,
    isFeatured: true,
    ...over,
  });

  const variety = (id: number, name: string, images: ReturnType<typeof image>[]) => ({
    id,
    productId: 1,
    name,
    description: null,
    sku: null,
    priceOverride: null,
    shippingAmountOverride: null,
    availabilityOverride: null,
    displayOrder: id,
    isActive: true,
    images,
  });

  const sizeGroup = {
    id: 9,
    productId: 1,
    key: "size",
    label: "Size",
    displayOrder: 0,
    required: true,
    helpText: null,
    isActive: true,
    values: [{ id: 90, groupId: 9, label: "40 x 40", value: "40x40", displayOrder: 0, priceAdjustment: 0, sku: null, imageUrl: null, description: null, isActive: true }],
  };

  function mockVarietyProduct(varieties: ReturnType<typeof variety>[]) {
    mockUseGetProduct.mockReturnValue({
      data: {
        ...baseProduct,
        availability: "available",
        type: "physical",
        imageUrl: "https://cdn.test/product.webp",
        thumbnailUrl: "https://cdn.test/product-thumb.webp",
        optionGroups: [sizeGroup],
        varieties,
        gallery: [],
      },
      isLoading: false,
      error: null,
    });
  }

  async function addToCart(user: ReturnType<typeof userEvent.setup>, varietyName: string) {
    await user.click(screen.getByRole("button", { name: new RegExp(varietyName, "i") }));
    await user.click(screen.getByRole("button", { name: "40 x 40" }));
    await user.click(screen.getByRole("button", { name: /add selection/i }));
    await user.click(screen.getByRole("button", { name: /add all to cart/i }));
  }

  function storedCart() {
    return JSON.parse(localStorage.getItem("afripebbles_cart_v1") ?? "[]");
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it("stores the selected variety's image on the cart line instead of the product image", async () => {
    const user = userEvent.setup();
    mockVarietyProduct([
      variety(100, "Red Collection", [image({ id: 1, url: "https://cdn.test/red.webp", thumbnailUrl: "https://cdn.test/red-thumb.webp" })]),
      variety(101, "Green Collection", [image({ id: 2, url: "https://cdn.test/green.webp", thumbnailUrl: "https://cdn.test/green-thumb.webp" })]),
    ]);
    renderProductPage();

    await addToCart(user, "Green Collection");

    const cart = storedCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].varietyName).toBe("Green Collection");
    expect(cart[0].snapshot.imageUrl).toBe("https://cdn.test/green-thumb.webp");
    expect(cart[0].snapshot.imageUrl).not.toBe("https://cdn.test/product.webp");
  });

  it("gives two different varieties two different cart line images", async () => {
    const user = userEvent.setup();
    mockVarietyProduct([
      variety(100, "Red Collection", [image({ id: 1, url: "https://cdn.test/red.webp", thumbnailUrl: "https://cdn.test/red-thumb.webp" })]),
      variety(101, "Green Collection", [image({ id: 2, url: "https://cdn.test/green.webp", thumbnailUrl: "https://cdn.test/green-thumb.webp" })]),
    ]);
    renderProductPage();

    await addToCart(user, "Red Collection");
    await addToCart(user, "Green Collection");

    const cart = storedCart();
    expect(cart).toHaveLength(2);
    expect(cart.map((l: { snapshot: { imageUrl: string } }) => l.snapshot.imageUrl)).toEqual([
      "https://cdn.test/red-thumb.webp",
      "https://cdn.test/green-thumb.webp",
    ]);
  });

  it("falls back to the variety's display image when that variety has no thumbnail derivative", async () => {
    const user = userEvent.setup();
    mockVarietyProduct([variety(100, "Legacy Collection", [image({ id: 1, url: "https://cdn.test/legacy.png", thumbnailUrl: null })])]);
    renderProductPage();

    await addToCart(user, "Legacy Collection");

    expect(storedCart()[0].snapshot.imageUrl).toBe("https://cdn.test/legacy.png");
  });

  it("falls back to the product image when the selected variety has no image at all", async () => {
    const user = userEvent.setup();
    mockVarietyProduct([variety(100, "Unpictured Collection", [])]);
    renderProductPage();

    await addToCart(user, "Unpictured Collection");

    expect(storedCart()[0].snapshot.imageUrl).toBe("https://cdn.test/product.webp");
  });

  it("leaves an option-group product with no varieties on the product image", async () => {
    const user = userEvent.setup();
    mockVarietyProduct([]);
    renderProductPage();

    await user.click(screen.getByRole("button", { name: "40 x 40" }));
    await user.click(screen.getByRole("button", { name: /add selection/i }));
    await user.click(screen.getByRole("button", { name: /add all to cart/i }));

    const cart = storedCart();
    expect(cart).toHaveLength(1);
    expect(cart[0].varietyId).toBeNull();
    expect(cart[0].snapshot.imageUrl).toBe("https://cdn.test/product.webp");
  });
});
