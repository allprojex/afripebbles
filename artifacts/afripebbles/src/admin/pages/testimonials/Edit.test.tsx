import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import AdminTestimonialEdit from "./Edit";

const baseTestimonial = {
  id: 5,
  displayName: "Jane Doe",
  roleCompany: "Founder",
  testimonialText: "Wonderful.",
  imageUrl: "https://example.com/a.png",
  category: null,
  isFeatured: false,
  displayOrder: 0,
  status: "published" as const,
  scheduledAt: null,
};

const mockUseAdminGetTestimonial = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useAdminGetTestimonial: (...args: unknown[]) => mockUseAdminGetTestimonial(...args),
  useAdminCreateTestimonial: () => ({ mutate: vi.fn(), isPending: false }),
  useAdminUpdateTestimonial: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useAdminDeleteTestimonial: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderEdit(path = "/5") {
  const { hook } = memoryLocation({ path, static: true });
  return render(
    <Router hook={hook}>
      <Route path="/:id" component={AdminTestimonialEdit} />
    </Router>,
  );
}

describe("AdminTestimonialEdit — status select", () => {
  beforeEach(() => {
    mockUseAdminGetTestimonial.mockReset();
    mockUpdateMutate.mockReset();
  });

  it("shows the saved Status once the testimonial loads asynchronously", async () => {
    mockUseAdminGetTestimonial.mockReturnValue({ data: baseTestimonial, isLoading: false });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Jane Doe"));
    expect(screen.getByLabelText("Status")).toHaveTextContent("Published");
  });

  it("does not crash and leaves optional fields blank when they are null", async () => {
    mockUseAdminGetTestimonial.mockReturnValue({
      data: { ...baseTestimonial, roleCompany: null, category: null },
      isLoading: false,
    });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("Jane Doe"));
    expect(screen.getByLabelText("Role / company (optional)")).toHaveValue("");
    expect(screen.getByLabelText("Category (optional)")).toHaveValue("");
  });

  it("uses the intended default (Draft) on a brand-new testimonial form", async () => {
    mockUseAdminGetTestimonial.mockReturnValue({ data: undefined, isLoading: false });
    renderEdit("/new");

    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
    expect(screen.getByLabelText("Status")).toHaveTextContent("Draft");
  });

  it("preserves a changed Status selection through save", async () => {
    const user = userEvent.setup();
    mockUseAdminGetTestimonial.mockReturnValue({ data: baseTestimonial, isLoading: false });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveTextContent("Published"));

    await user.click(screen.getByLabelText("Status"));
    await user.click(await screen.findByRole("option", { name: "Archived" }));
    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveTextContent("Archived"));

    await user.click(screen.getByRole("button", { name: /save testimonial/i }));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
    const [call] = mockUpdateMutate.mock.calls[0];
    expect(call.data.status).toBe("archived");
    expect(call.data.displayName).toBe("Jane Doe");
  });
});
