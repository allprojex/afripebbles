import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { CartProvider } from "@/lib/cart";
import PodcastListing from "./index";
import { siteConfig } from "@/content/site";

vi.mock("@workspace/api-client-react", () => ({
  useListPodcastEpisodes: () => ({ data: [], isLoading: false }),
  // Footer and Seo (rendered by every page via Layout) need these too.
  useSubscribeNewsletter: () => ({ mutate: vi.fn(), isPending: false }),
  useGetSiteSettings: () => ({ data: null }),
}));

describe("PodcastListing (pre-launch)", () => {
  it("shows an honest coming-soon state instead of fake episodes", () => {
    render(
      <Router base="">
        <CartProvider>
          <PodcastListing />
        </CartProvider>
      </Router>
    );

    expect(screen.getByRole("heading", { name: siteConfig.podcast.name })).toBeInTheDocument();
    expect(screen.getByText(/hasn't launched yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no episodes yet/i)).toBeInTheDocument();

    // Must not claim to have real episode data when there is none.
    expect(screen.queryByText(/episode 1/i)).not.toBeInTheDocument();
  });
});
