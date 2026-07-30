import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import Contact from "./contact";

const mockMutate = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useSubmitContactEnquiry: () => ({ mutate: mockMutate, isPending: false }),
  // Footer (rendered by every page via Layout) needs this too.
  useSubscribeNewsletter: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderContact() {
  return render(
    <Router base="">
      <Contact />
    </Router>
  );
}

describe("Contact form validation", () => {
  it("blocks submission and shows errors when required fields are empty", async () => {
    const user = userEvent.setup();
    renderContact();

    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/please share a few more details/i)).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("requires consent before submitting, even with valid name/email/message", async () => {
    const user = userEvent.setup();
    renderContact();

    await user.type(screen.getByLabelText(/^name$/i), "Jane Doe");
    await user.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await user.type(screen.getByLabelText(/^message$/i), "I'd love to know more about your planners.");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/please confirm you're okay/i)).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
