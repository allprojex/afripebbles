import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import Community from "./community";

const mockMutate = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useSubscribeNewsletter: () => ({ mutate: mockMutate, isPending: false }),
  // Seo (rendered by every page) needs this too.
  useGetSiteSettings: () => ({ data: null }),
}));

function renderCommunity() {
  return render(
    <Router base="">
      <Community />
    </Router>
  );
}

describe("Newsletter validation (Community page)", () => {
  it("rejects an empty submission and does not call the subscribe mutation", async () => {
    // Note: an actively malformed email (e.g. "not-an-email") can't reach
    // zod's validator in this test — the input's native type="email"
    // constraint validation blocks the submit event first, same as a real
    // browser. Empty-required-field validation is zod's reachable path.
    const user = userEvent.setup();
    renderCommunity();

    await user.click(screen.getByRole("button", { name: /join now/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("rejects submission without checking the consent checkbox", async () => {
    const user = userEvent.setup();
    renderCommunity();

    await user.type(screen.getByPlaceholderText(/your first name/i), "Jane");
    await user.type(screen.getAllByPlaceholderText(/your email address/i)[0], "jane@example.com");
    await user.click(screen.getByRole("button", { name: /join now/i }));

    await waitFor(() => {
      expect(screen.getByText(/please agree to receive emails/i)).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits with a valid email, first name, and consent checked", async () => {
    const user = userEvent.setup();
    renderCommunity();

    await user.type(screen.getByPlaceholderText(/your first name/i), "Jane");
    await user.type(screen.getAllByPlaceholderText(/your email address/i)[0], "jane@example.com");
    // The page's own consent checkbox, not the Footer's (also rendered via Layout).
    await user.click(screen.getAllByRole("checkbox")[0]);
    await user.click(screen.getByRole("button", { name: /join now/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { email: "jane@example.com", firstName: "Jane", consent: true } }),
        expect.anything()
      );
    });
  });
});
