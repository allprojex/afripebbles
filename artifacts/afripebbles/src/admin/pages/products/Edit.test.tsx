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
  optionGroups: [],
  varieties: [],
  gallery: [],
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

  it("adding an option group with a value saves optionGroups in the payload, auto-slugifying the internal keys", async () => {
    const user = userEvent.setup();
    mockUseAdminGetProduct.mockReturnValue({ data: baseProduct, isLoading: false });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("hddh"));

    await user.click(screen.getByRole("button", { name: /add option group/i }));
    await user.type(screen.getByPlaceholderText("e.g. Size, Color, Dimensions"), "Size");
    await user.click(screen.getByRole("button", { name: /^add value$/i }));
    await user.type(screen.getByPlaceholderText("e.g. Large"), "Large");

    await user.click(screen.getByRole("button", { name: /save product/i }));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
    const [call] = mockUpdateMutate.mock.calls[0];
    expect(call.data.optionGroups).toHaveLength(1);
    expect(call.data.optionGroups[0].label).toBe("Size");
    expect(call.data.optionGroups[0].key).toBe("size");
    expect(call.data.optionGroups[0].values).toHaveLength(1);
    expect(call.data.optionGroups[0].values[0].label).toBe("Large");
    expect(call.data.optionGroups[0].values[0].value).toBe("large");
  });

  it("adding a variety saves varieties in the payload with its images mapped to {url}", async () => {
    const user = userEvent.setup();
    mockUseAdminGetProduct.mockReturnValue({ data: baseProduct, isLoading: false });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("hddh"));

    await user.click(screen.getByRole("button", { name: /add variety/i }));
    await user.type(screen.getByPlaceholderText("e.g. Burgundy set"), "Burgundy set");

    await user.click(screen.getByRole("button", { name: /save product/i }));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
    const [call] = mockUpdateMutate.mock.calls[0];
    expect(call.data.varieties).toHaveLength(1);
    expect(call.data.varieties[0].name).toBe("Burgundy set");
    expect(call.data.varieties[0].images).toEqual([]);
    expect(call.data.gallery).toEqual([]);
  });

  it("leaves a variety's price/shipping override as null when the field is left blank, not 0", async () => {
    const user = userEvent.setup();
    mockUseAdminGetProduct.mockReturnValue({ data: baseProduct, isLoading: false });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("hddh"));

    await user.click(screen.getByRole("button", { name: /add variety/i }));
    await user.type(screen.getByPlaceholderText("e.g. Burgundy set"), "White set");
    // Deliberately never touch the price/shipping override fields — they should stay unset.

    await user.click(screen.getByRole("button", { name: /save product/i }));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
    const [call] = mockUpdateMutate.mock.calls[0];
    expect(call.data.varieties[0].priceOverride).toBeNull();
    expect(call.data.varieties[0].shippingAmountOverride).toBeNull();
  });

  it("shows a one-click migration from legacy variants to option groups, only when option groups are still empty", async () => {
    const user = userEvent.setup();
    mockUseAdminGetProduct.mockReturnValue({
      data: { ...baseProduct, variants: [{ label: "Size", options: ["S", "M", "L"] }] },
      isLoading: false,
    });
    renderEdit();

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("hddh"));
    const convertButton = screen.getByRole("button", { name: /convert legacy variants/i });
    await user.click(convertButton);

    await user.click(screen.getByRole("button", { name: /save product/i }));
    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
    const [call] = mockUpdateMutate.mock.calls[0];
    expect(call.data.optionGroups).toHaveLength(1);
    expect(call.data.optionGroups[0].label).toBe("Size");
    expect(call.data.optionGroups[0].values.map((v: { label: string }) => v.label)).toEqual(["S", "M", "L"]);
    // The legacy variants field itself is untouched by the conversion — it's additive, not destructive.
    expect(call.data.variants).toEqual([{ label: "Size", options: ["S", "M", "L"] }]);
  });
});
