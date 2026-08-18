import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import AdminProductEdit from "./Edit";

const baseProduct = {
  id: 104,
  slug: "hddh",
  title: "hddh",
  description: "desc",
  shortDescription: null,
  price: 0,
  currency: "EUR",
  type: "digital" as const,
  category: null,
  imageUrl: null,
  images: [],
  previewImageUrl: null,
  availability: "preorder" as const,
  stockStatus: "limited" as const,
  isFeatured: false,
  downloadUrl: null,
  shippingAmount: 0,
  digitalDownloadPath: null,
  preorderOpensAt: null,
  preorderClosesAt: null,
  estimatedFulfilment: null,
  regions: [],
  variants: [],
  externalPurchaseUrl: null,
  tags: [],
  status: "published" as const,
  scheduledAt: null,
  seoTitle: null,
  seoDescription: null,
};

const mockUseAdminGetProduct = vi.fn();
const mockUpdateMutate = vi.fn();
const mockCreateMutate = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useAdminGetProduct: (...args: unknown[]) => mockUseAdminGetProduct(...args),
  useAdminCreateProduct: () => ({ mutate: mockCreateMutate, isPending: false }),
  useAdminUpdateProduct: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useAdminDeleteProduct: () => ({ mutate: vi.fn(), isPending: false }),
  ApiError: class ApiError extends Error {},
}));

function renderEdit(path = "/104") {
  const { hook } = memoryLocation({ path, static: true });
  return render(
    <Router hook={hook}>
      <Route path="/:id" component={AdminProductEdit} />
    </Router>,
  );
}

describe("AdminProductEdit — status/availability selects", () => {
  beforeEach(() => {
    mockUseAdminGetProduct.mockReset();
    mockUpdateMutate.mockReset();
    mockCreateMutate.mockReset();
  });

  it("shows the saved Availability and Status once the product loads asynchronously", async () => {
    mockUseAdminGetProduct.mockReturnValue({ data: baseProduct, isLoading: false });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("hddh"));

    expect(screen.getByLabelText("Availability")).toHaveTextContent("Pre-order");
    expect(screen.getByLabelText("Status")).toHaveTextContent("Published");
  });

  it("does not crash and leaves optional fields blank when they are null", async () => {
    mockUseAdminGetProduct.mockReturnValue({
      data: { ...baseProduct, category: null, downloadUrl: null, seoTitle: null, seoDescription: null },
      isLoading: false,
    });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("hddh"));
    expect(screen.getByLabelText("Category")).toHaveValue("");
    expect(screen.getByLabelText("Legacy download URL (unused by order fulfilment)")).toHaveValue("");
  });

  it("uses the intended defaults (Available / Draft) on a brand-new product form", async () => {
    mockUseAdminGetProduct.mockReturnValue({ data: undefined, isLoading: false });
    renderEdit("/new");

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue(""));
    expect(screen.getByLabelText("Availability")).toHaveTextContent("Available");
    expect(screen.getByLabelText("Status")).toHaveTextContent("Draft");
  });

  it("preserves a changed Status selection through save", async () => {
    const user = userEvent.setup();
    mockUseAdminGetProduct.mockReturnValue({ data: baseProduct, isLoading: false });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveTextContent("Published"));

    await user.click(screen.getByLabelText("Status"));
    await user.click(await screen.findByRole("option", { name: "Archived" }));
    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveTextContent("Archived"));

    await user.click(screen.getByRole("button", { name: /save product/i }));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
    const [call] = mockUpdateMutate.mock.calls[0];
    expect(call.data.status).toBe("archived");
    // Unrelated field should be preserved, not clobbered by the save.
    expect(call.data.availability).toBe("preorder");
  });
});
