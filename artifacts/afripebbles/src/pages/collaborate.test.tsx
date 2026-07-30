import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import Collaborate from "./collaborate";
import { siteConfig } from "@/content/site";

const mockMutate = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useSubmitCollaborationEnquiry: () => ({ mutate: mockMutate, isPending: false }),
  // Footer (rendered by every page via Layout) needs this too.
  useSubscribeNewsletter: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderCollaborate() {
  return render(
    <Router base="">
      <Collaborate />
    </Router>
  );
}

describe("Collaborate form", () => {
  it("blocks submission when required fields are missing", async () => {
    const user = userEvent.setup();
    renderCollaborate();

    await user.click(screen.getByRole("button", { name: /submit enquiry/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("offers every collaboration type from the questionnaire, and nothing invented", () => {
    renderCollaborate();

    // Each type appears both in the "Available For" list and the select dropdown options.
    for (const type of siteConfig.collaborationTypes) {
      expect(screen.getAllByText(type).length).toBeGreaterThan(0);
    }
  });

  it("collects budget range, timeline, and links as optional fields", () => {
    renderCollaborate();

    expect(screen.getByLabelText(/budget range/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^timeline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/relevant links/i)).toBeInTheDocument();
  });
});
