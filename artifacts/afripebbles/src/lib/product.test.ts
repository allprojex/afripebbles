import { describe, expect, it } from "vitest";
import { AVAILABILITY_LABEL, isOrderable } from "./product";

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
