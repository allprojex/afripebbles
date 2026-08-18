import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { CartProvider } from "@/lib/cart";
import CuratedPicks from "./curated";
import { siteConfig } from "@/content/site";

const mockPicks = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useListCuratedPicks: () => mockPicks(),
  useGetSiteSettings: () => ({ data: null }),
  // Footer (rendered by every page via Layout) needs this too.
  useSubscribeNewsletter: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderCurated() {
  return render(
    <Router base="">
      <CartProvider>
        <CuratedPicks />
      </CartProvider>
    </Router>,
  );
}

describe("Curated recommendations — affiliate disclosure", () => {
  it("shows the site-wide affiliate disclosure banner", () => {
    mockPicks.mockReturnValue({ data: [], isLoading: false });
    renderCurated();
    expect(screen.getByText(siteConfig.affiliateDisclosure)).toBeInTheDocument();
  });

  it("shows a per-item disclosure only for picks that are actually affiliate links", () => {
    mockPicks.mockReturnValue({
      data: [
        {
          id: 1,
          slug: "affiliate-pick",
          title: "Affiliate Pick",
          description: "Desc",
          category: "Beauty",
          imageUrl: null,
          affiliateUrl: "https://example.com/a",
          brand: "Brand A",
          isAffiliate: true,
          affiliateDisclosureText: null,
          isPersonallyTested: false,
          isFeatured: false,
        },
        {
          id: 2,
          slug: "non-affiliate-pick",
          title: "Non-Affiliate Pick",
          description: "Desc",
          category: "Beauty",
          imageUrl: null,
          affiliateUrl: "https://example.com/b",
          brand: "Brand B",
          isAffiliate: false,
          affiliateDisclosureText: null,
          isPersonallyTested: false,
          isFeatured: false,
        },
      ],
      isLoading: false,
    });

    renderCurated();

    // The site-wide banner plus the affiliate card's own disclosure = 2 occurrences.
    expect(screen.getAllByText(siteConfig.affiliateDisclosure).length).toBe(2);
  });

  it("respects a pick's own custom disclosure text over the site-wide default", () => {
    mockPicks.mockReturnValue({
      data: [
        {
          id: 1,
          slug: "custom-disclosure-pick",
          title: "Custom Disclosure Pick",
          description: "Desc",
          category: "Beauty",
          imageUrl: null,
          affiliateUrl: "https://example.com/a",
          brand: "Brand A",
          isAffiliate: true,
          affiliateDisclosureText: "A custom disclosure just for this item.",
          isPersonallyTested: false,
          isFeatured: false,
        },
      ],
      isLoading: false,
    });

    renderCurated();
    expect(screen.getByText("A custom disclosure just for this item.")).toBeInTheDocument();
  });
});
