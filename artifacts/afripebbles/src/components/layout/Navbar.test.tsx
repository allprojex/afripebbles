import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import Navbar from "./Navbar";
import { siteConfig } from "@/content/site";
import { CartProvider } from "@/lib/cart";

function renderNavbar() {
  return render(
    <Router base="">
      <CartProvider>
        <Navbar />
      </CartProvider>
    </Router>
  );
}

describe("Navbar", () => {
  it("renders every configured primary nav link with the correct href", () => {
    renderNavbar();

    for (const link of siteConfig.nav.primary) {
      // Desktop + mobile menus both render the label, so there are two matches.
      const matches = screen.getAllByRole("link", { name: link.label });
      expect(matches.length).toBeGreaterThan(0);
      for (const match of matches) {
        expect(match).toHaveAttribute("href", link.href);
      }
    }
  });

  it("uses the real podcast name, not a generic 'Podcast' label", () => {
    renderNavbar();
    expect(screen.getAllByRole("link", { name: siteConfig.podcast.name }).length).toBeGreaterThan(0);
  });

  it("opens the mobile menu on toggle and reveals nav links", async () => {
    const user = userEvent.setup();
    renderNavbar();

    const toggle = screen.getByRole("button", { name: "Open menu" });
    // Mobile nav links aren't rendered until the menu is opened.
    expect(screen.queryAllByRole("link", { name: "About" }).length).toBe(1);

    await user.click(toggle);

    expect(screen.queryAllByRole("link", { name: "About" }).length).toBe(2);
  });
});
