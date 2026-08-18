import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router, Route } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import AdminOrderDetail from "./Detail";

const baseOrder = {
  id: 25,
  orderReference: "AP-20260101-ABC123",
  customerName: "Test Customer",
  customerEmail: "test@example.com",
  customerPhone: "233241234567",
  country: "Ghana",
  deliveryAddress: null,
  notes: null,
  currency: "EUR",
  subtotal: 25,
  shippingTotal: 5,
  discountTotal: 0,
  grandTotal: 30,
  paymentMethod: "mobile_money",
  paymentStatus: "pending" as const,
  orderStatus: "pending_payment" as const,
  paymentNote: null,
  paidAt: null,
  trackingNumber: null,
  internalNotes: null,
  couponCode: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  items: [
    {
      id: 1,
      orderId: 25,
      productId: 5,
      productName: "Test Product",
      productType: "physical" as const,
      variant: null,
      quantity: 1,
      unitPrice: 25,
      lineTotal: 25,
      shippingAmount: 5,
      isDigital: false,
      isPreorder: false,
      preorderFulfilmentText: null,
      createdAt: "2026-01-01T10:00:00.000Z",
    },
  ],
};

const mockUseAdminGetOrder = vi.fn();
const mockUpdateMutate = vi.fn();
const mockRefetch = vi.fn();
let mockSettings: unknown = null;

vi.mock("@workspace/api-client-react", () => ({
  useAdminGetOrder: (...args: unknown[]) => mockUseAdminGetOrder(...args),
  useAdminUpdateOrder: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useGetSiteSettings: () => ({ data: mockSettings }),
}));

function renderDetail(path = "/25") {
  const { hook } = memoryLocation({ path, static: true });
  return render(
    <Router hook={hook}>
      <Route path="/:id" component={AdminOrderDetail} />
    </Router>,
  );
}

describe("AdminOrderDetail — status changes must be reflected, not silently reverted", () => {
  beforeEach(() => {
    mockUseAdminGetOrder.mockReset();
    mockUpdateMutate.mockReset();
    mockRefetch.mockReset();
    mockSettings = null;
  });

  it("submits the new payment status and refetches on success, so the UI doesn't snap back to the stale server value", async () => {
    const user = userEvent.setup();
    mockUseAdminGetOrder.mockReturnValue({ data: { order: baseOrder, history: [] }, isLoading: false, refetch: mockRefetch });
    renderDetail();

    await waitFor(() => expect(screen.getByText("AP-20260101-ABC123")).toBeInTheDocument());

    const paymentStatusSection = screen.getByText("Payment status").parentElement!;
    await user.click(within(paymentStatusSection).getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Paid" }));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledTimes(1));
    const [payload, callbacks] = mockUpdateMutate.mock.calls[0];
    expect(payload.id).toBe(25);
    expect(payload.data.paymentStatus).toBe("paid");

    // Without a refetch after a successful mutation, the Select stays bound to the
    // now-stale `order.paymentStatus` from the original query response and silently
    // reverts — this is the regression this test guards against.
    callbacks.onSuccess({});
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("refetches after saving tracking number / internal notes / payment note too", async () => {
    const user = userEvent.setup();
    mockUseAdminGetOrder.mockReturnValue({ data: { order: baseOrder, history: [] }, isLoading: false, refetch: mockRefetch });
    renderDetail();

    await waitFor(() => expect(screen.getByText("AP-20260101-ABC123")).toBeInTheDocument());

    const trackingSection = screen.getByText("Tracking number").parentElement!;
    await user.type(within(trackingSection).getByRole("textbox"), "TRK-123");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledTimes(1));
    const [, callbacks] = mockUpdateMutate.mock.calls[0];
    callbacks.onSuccess({});
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('"Open in WhatsApp" falls back to the general whatsappNumber when commerceWhatsappNumber is unset', async () => {
    mockUseAdminGetOrder.mockReturnValue({ data: { order: baseOrder, history: [] }, isLoading: false, refetch: mockRefetch });
    mockSettings = { commerceWhatsappNumber: null, whatsappNumber: "233242325818" };
    renderDetail();

    await waitFor(() => expect(screen.getByText("AP-20260101-ABC123")).toBeInTheDocument());

    const link = screen.getByRole("link", { name: /open in whatsapp/i });
    expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\/233242325818\?text=/));
  });

  it('"Open in WhatsApp" is hidden and shows the setup hint when neither number is configured', async () => {
    mockUseAdminGetOrder.mockReturnValue({ data: { order: baseOrder, history: [] }, isLoading: false, refetch: mockRefetch });
    mockSettings = { commerceWhatsappNumber: null, whatsappNumber: null };
    renderDetail();

    await waitFor(() => expect(screen.getByText("AP-20260101-ABC123")).toBeInTheDocument());

    expect(screen.queryByRole("link", { name: /open in whatsapp/i })).not.toBeInTheDocument();
    expect(screen.getByText(/set a.*whatsapp number in site settings/i)).toBeInTheDocument();
  });
});
