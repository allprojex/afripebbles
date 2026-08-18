import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Router } from "wouter";
import { CartProvider } from "@/lib/cart";
import TrackOrder from "./track-order";

const mockTrackMutate = vi.fn();
let trackData: unknown;

vi.mock("@workspace/api-client-react", () => ({
  useTrackOrder: () => ({ mutate: mockTrackMutate, data: trackData, isPending: false, isError: false, error: null }),
  useGetOrderItemDownloadUrl: () => ({ data: undefined, isFetching: false, error: null }),
  useGetSiteSettings: () => ({ data: null }),
  useSubscribeNewsletter: () => ({ mutate: vi.fn(), isPending: false }),
  ApiError: class ApiError extends Error {},
}));

function renderTrackOrder() {
  return render(
    <Router base="">
      <CartProvider>
        <TrackOrder />
      </CartProvider>
    </Router>,
  );
}

describe("TrackOrder — public view privacy", () => {
  it("never renders internal fields even if present in the API response (defense in depth beyond backend filtering)", () => {
    trackData = {
      orderReference: "AP-20260101-ABC123",
      createdAt: "2026-01-01T10:00:00.000Z",
      currency: "GHS",
      grandTotal: 50,
      paymentStatus: "paid",
      orderStatus: "processing",
      trackingNumber: "TRK1",
      // A hypothetical backend bug leaking these must still not surface in the DOM this page renders.
      internalNotes: "SECRET-ADMIN-NOTE",
      customerEmail: "customer@example.com",
      customerPhone: "233241234567",
      items: [{ productId: 1, productName: "Faith Journal", variant: null, quantity: 1, lineTotal: 50, isDigital: false, isPreorder: false }],
    };

    renderTrackOrder();

    expect(screen.getByText("AP-20260101-ABC123")).toBeInTheDocument();
    expect(screen.queryByText(/SECRET-ADMIN-NOTE/)).not.toBeInTheDocument();
    expect(screen.queryByText(/customer@example\.com/)).not.toBeInTheDocument();
  });

  it("submits the reference and email exactly as entered", async () => {
    trackData = undefined;
    const user = userEvent.setup();
    renderTrackOrder();

    await user.type(screen.getByPlaceholderText(/order reference/i), "AP-20260101-ABC123");
    await user.type(screen.getByPlaceholderText(/email used at checkout/i), "customer@example.com");
    await user.click(screen.getByRole("button", { name: /^track$/i }));

    expect(mockTrackMutate).toHaveBeenCalledWith({ data: { orderReference: "AP-20260101-ABC123", email: "customer@example.com" } });
  });

  it("only offers a download for a digital item once the order is paid", () => {
    trackData = {
      orderReference: "AP-20260101-ABC123",
      createdAt: "2026-01-01T10:00:00.000Z",
      currency: "EUR",
      grandTotal: 12,
      paymentStatus: "pending",
      orderStatus: "pending_payment",
      trackingNumber: null,
      items: [{ productId: 1, productName: "Gratitude Planner", variant: null, quantity: 1, lineTotal: 12, isDigital: true, isPreorder: false }],
    };

    renderTrackOrder();
    expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
  });
});
