import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import AdminUgcEdit from "./Edit";

const baseEntry = {
  id: 5,
  title: "Sample entry",
  description: "desc",
  projectCategory: "Audit",
  mediaType: "image" as const,
  imageUrl: "https://example.com/a.png",
  youtubeVideoId: null,
  brandName: null,
  externalLink: null,
  isFeatured: false,
  displayOrder: 0,
  status: "published" as const,
  scheduledAt: null,
};

const mockUseAdminGetUgcEntry = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useAdminGetUgcEntry: (...args: unknown[]) => mockUseAdminGetUgcEntry(...args),
  useAdminCreateUgcEntry: () => ({ mutate: vi.fn(), isPending: false }),
  useAdminUpdateUgcEntry: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useAdminDeleteUgcEntry: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderEdit(path = "/5") {
  const { hook } = memoryLocation({ path, static: true });
  return render(
    <Router hook={hook}>
      <Route path="/:id" component={AdminUgcEdit} />
    </Router>,
  );
}

describe("AdminUgcEdit — status select", () => {
  beforeEach(() => {
    mockUseAdminGetUgcEntry.mockReset();
    mockUpdateMutate.mockReset();
  });

  it("shows the saved Status once the entry loads asynchronously", async () => {
    mockUseAdminGetUgcEntry.mockReturnValue({ data: baseEntry, isLoading: false });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Sample entry"));
    expect(screen.getByLabelText("Status")).toHaveTextContent("Published");
  });

  it("does not crash and leaves optional fields blank when they are null", async () => {
    mockUseAdminGetUgcEntry.mockReturnValue({
      data: { ...baseEntry, brandName: null, externalLink: null, projectCategory: null },
      isLoading: false,
    });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("Sample entry"));
    expect(screen.getByLabelText("Brand name (optional)")).toHaveValue("");
    expect(screen.getByLabelText("External link (optional)")).toHaveValue("");
  });

  it("uses the intended default (Draft) on a brand-new entry form", async () => {
    mockUseAdminGetUgcEntry.mockReturnValue({ data: undefined, isLoading: false });
    renderEdit("/new");

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue(""));
    expect(screen.getByLabelText("Status")).toHaveTextContent("Draft");
  });

  it("preserves a changed Status selection through save", async () => {
    const user = userEvent.setup();
    mockUseAdminGetUgcEntry.mockReturnValue({ data: baseEntry, isLoading: false });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveTextContent("Published"));

    await user.click(screen.getByLabelText("Status"));
    await user.click(await screen.findByRole("option", { name: "Archived" }));
    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveTextContent("Archived"));

    await user.click(screen.getByRole("button", { name: /save entry/i }));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
    const [call] = mockUpdateMutate.mock.calls[0];
    expect(call.data.status).toBe("archived");
    expect(call.data.title).toBe("Sample entry");
  });
});
