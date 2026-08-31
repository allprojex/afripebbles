import { describe, expect, it } from "vitest";
import { AVAILABILITY_LABEL, cartLineImageUrl, isOrderable, primaryVarietyImage } from "./product";

describe("isOrderable", () => {
  it("treats available and preorder products as orderable", () => {
    expect(isOrderable("available")).toBe(true);
    expect(isOrderable("preorder")).toBe(true);
  });

  it("treats coming_soon and out_of_stock products as not orderable", () => {
    expect(isOrderable("coming_soon")).toBe(false);
    expect(isOrderable("out_of_stock")).toBe(false);
  });
});

describe("AVAILABILITY_LABEL", () => {
  it("has a human-readable label for every availability state", () => {
    expect(AVAILABILITY_LABEL.available).toBe("Available");
    expect(AVAILABILITY_LABEL.preorder).toBe("Pre-order");
    expect(AVAILABILITY_LABEL.coming_soon).toBe("Coming Soon");
    expect(AVAILABILITY_LABEL.out_of_stock).toBe("Out of Stock");
  });
});

describe("primaryVarietyImage", () => {
  it("prefers the explicitly featured image over the first one", () => {
    const variety = {
      images: [
        { url: "https://cdn.test/a.webp", thumbnailUrl: null, isFeatured: false },
        { url: "https://cdn.test/b.webp", thumbnailUrl: null, isFeatured: true },
      ],
    };
    expect(primaryVarietyImage(variety)?.url).toBe("https://cdn.test/b.webp");
  });

  it("falls back to the first image when none is flagged featured", () => {
    const variety = {
      images: [
        { url: "https://cdn.test/a.webp", thumbnailUrl: null },
        { url: "https://cdn.test/b.webp", thumbnailUrl: null },
      ],
    };
    expect(primaryVarietyImage(variety)?.url).toBe("https://cdn.test/a.webp");
  });

  it("returns null for a variety with no images, and for no variety at all", () => {
    expect(primaryVarietyImage({ images: [] })).toBeNull();
    expect(primaryVarietyImage(null)).toBeNull();
    expect(primaryVarietyImage(undefined)).toBeNull();
  });
});

describe("cartLineImageUrl", () => {
  const productImage = "https://cdn.test/product.webp";

  it("uses the selected variety's image rather than the product image", () => {
    const variety = { images: [{ url: "https://cdn.test/green.webp", thumbnailUrl: "https://cdn.test/green-thumb.webp" }] };
    expect(cartLineImageUrl(variety, productImage)).toBe("https://cdn.test/green-thumb.webp");
  });

  it("gives two different varieties two different cart images", () => {
    const red = { images: [{ url: "https://cdn.test/red.webp", thumbnailUrl: "https://cdn.test/red-thumb.webp" }] };
    const green = { images: [{ url: "https://cdn.test/green.webp", thumbnailUrl: "https://cdn.test/green-thumb.webp" }] };
    expect(cartLineImageUrl(red, productImage)).not.toBe(cartLineImageUrl(green, productImage));
    expect(cartLineImageUrl(red, productImage)).toBe("https://cdn.test/red-thumb.webp");
    expect(cartLineImageUrl(green, productImage)).toBe("https://cdn.test/green-thumb.webp");
  });

  it("prefers the variety's thumbnail derivative over its full display image", () => {
    const variety = { images: [{ url: "https://cdn.test/full.webp", thumbnailUrl: "https://cdn.test/small.webp" }] };
    expect(cartLineImageUrl(variety, productImage)).toBe("https://cdn.test/small.webp");
  });

  it("falls back to the variety's display image when it pre-dates the thumbnail pipeline", () => {
    expect(cartLineImageUrl({ images: [{ url: "https://cdn.test/legacy.png", thumbnailUrl: null }] }, productImage)).toBe("https://cdn.test/legacy.png");
    expect(cartLineImageUrl({ images: [{ url: "https://cdn.test/legacy.png" }] }, productImage)).toBe("https://cdn.test/legacy.png");
  });

  it("falls back to the product image when the variety has no image at all", () => {
    expect(cartLineImageUrl({ images: [] }, productImage)).toBe(productImage);
  });

  it("leaves products with no varieties on their own product image", () => {
    expect(cartLineImageUrl(null, productImage)).toBe(productImage);
    expect(cartLineImageUrl(undefined, productImage)).toBe(productImage);
  });

  it("returns null rather than throwing when neither a variety image nor a product image exists", () => {
    expect(cartLineImageUrl(null, null)).toBeNull();
    expect(cartLineImageUrl({ images: [] }, null)).toBeNull();
  });
});
