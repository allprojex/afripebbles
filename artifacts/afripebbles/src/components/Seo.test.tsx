import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Seo } from "./Seo";
import { siteConfig } from "@/content/site";

describe("Seo", () => {
  it("sets a unique document title using the site's title template", () => {
    render(<Seo title="About" path="/about" />);
    expect(document.title).toBe(siteConfig.seo.titleTemplate("About"));
  });

  it("falls back to the site default description when none is given", () => {
    render(<Seo title="About" path="/about" />);
    const description = document.head.querySelector('meta[name="description"]');
    expect(description?.getAttribute("content")).toBe(siteConfig.seo.defaultDescription);
  });

  it("uses a page-specific description when provided", () => {
    render(<Seo title="Shop" description="Custom shop description" path="/shop" />);
    const description = document.head.querySelector('meta[name="description"]');
    expect(description?.getAttribute("content")).toBe("Custom shop description");
  });

  it("sets a canonical link derived from the given path", () => {
    render(<Seo title="FAQ" path="/faq" />);
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute("href")).toBe(`${siteConfig.seo.plannedDomain}/faq`);
  });
});
