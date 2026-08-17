import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import Home from "./home";
import { siteConfig } from "@/content/site";

vi.mock("@workspace/api-client-react", () => ({
  useGetHomepageSummary: () => ({ data: undefined, isLoading: false }),
  useGetHomepageContent: () => ({ data: null, isLoading: false }),
  useListTestimonials: () => ({ data: undefined, isLoading: false }),
  // Footer and Seo (rendered by every page via Layout) need these too.
  useSubscribeNewsletter: () => ({ mutate: vi.fn(), isPending: false }),
  useGetSiteSettings: () => ({ data: null }),
}));

describe("Home route", () => {
  it("renders without crashing and sets the homepage title", () => {
    render(
      <Router base="">
        <Home />
      </Router>
    );

    expect(document.title).toBe(siteConfig.seo.titleTemplate("Home"));
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("names the real podcast and uses the confirmed brand description, not placeholder copy", () => {
    render(
      <Router base="">
        <Home />
      </Router>
    );

    // The Footer (rendered on every page) repeats this description, so more than one match is expected.
    expect(screen.getAllByText(siteConfig.brand.oneLineDescription).length).toBeGreaterThan(0);
    expect(screen.getAllByText(siteConfig.podcast.name).length).toBeGreaterThan(0);
    expect(screen.queryByText(/built on replit/i)).not.toBeInTheDocument();
  });
});
