import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import Community from "./community";

const mockMutate = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useSubscribeNewsletter: () => ({ mutate: mockMutate, isPending: false }),
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

  it("submits with a valid email and first name", async () => {
    const user = userEvent.setup();
    renderCommunity();

    await user.type(screen.getByPlaceholderText(/your first name/i), "Jane");
    await user.type(screen.getAllByPlaceholderText(/your email address/i)[0], "jane@example.com");
    await user.click(screen.getByRole("button", { name: /join now/i }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { email: "jane@example.com", firstName: "Jane" } }),
        expect.anything()
      );
    });
  });
});
