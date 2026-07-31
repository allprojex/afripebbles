import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates a title", () => {
    expect(slugify("The Glow Up Sanctuary")).toBe("the-glow-up-sanctuary");
  });

  it("strips punctuation", () => {
    expect(slugify("Faith, Beauty & Health!")).toBe("faith-beauty-health");
  });

  it("collapses repeated separators and trims leading/trailing hyphens", () => {
    expect(slugify("  --Multiple   Spaces--  ")).toBe("multiple-spaces");
  });
});
