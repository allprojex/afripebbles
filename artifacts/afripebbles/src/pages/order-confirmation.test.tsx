import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Router } from "wouter";
import { CartProvider } from "@/lib/cart";
import OrderConfirmation from "./order-confirmation";
import type { OrderWithItems } from "@workspace/api-client-react";

let mockSettings: unknown;

vi.mock("@workspace/api-client-react", () => ({
  useGetSiteSettings: () => ({ data: mockSettings }),
  useSubscribeNewsletter: () => ({ mutate: vi.fn(), isPending: false }),
}));

const ORDER_STORAGE_KEY = "afripebbles_last_order";

const baseOrder: OrderWithItems = {
  id: 25,
  orderReference: "AP-20260101-ABC123",
  customerName: "Ama Owusu",
  customerEmail: "ama@example.com",
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
  paymentStatus: "pending",
  orderStatus: "pending_payment",
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
      productName: "Faith Journal",
      productType: "physical",
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

function renderConfirmation() {
  sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(baseOrder));
  return render(
    <Router base="">
      <CartProvider>
        <OrderConfirmation />
      </CartProvider>
    </Router>,
  );
}

describe("OrderConfirmation — WhatsApp number falls back to the general contact number", () => {
  beforeEach(() => {
    mockSettings = null;
    sessionStorage.clear();
  });

  it("shows the not-configured message when neither WhatsApp field is set", () => {
    mockSettings = { commerceWhatsappNumber: null, whatsappNumber: null };
    renderConfirmation();

    expect(screen.getByText(/whatsapp confirmation isn't configured yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /send order to whatsapp/i })).not.toBeInTheDocument();
  });

  it("uses the general whatsappNumber when commerceWhatsappNumber is unset — the reported bug", () => {
    mockSettings = { commerceWhatsappNumber: null, whatsappNumber: "233242325818" };
    renderConfirmation();

    const link = screen.getByRole("link", { name: /send order to whatsapp/i });
    expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\/233242325818\?text=/));
  });

  it("prefers commerceWhatsappNumber over whatsappNumber when both are set", () => {
    mockSettings = { commerceWhatsappNumber: "233209999999", whatsappNumber: "233242325818" };
    renderConfirmation();

    const link = screen.getByRole("link", { name: /send order to whatsapp/i });
    expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\/233209999999\?text=/));
  });

  it("URL-encodes the full order into the WhatsApp link text", () => {
    mockSettings = { commerceWhatsappNumber: null, whatsappNumber: "233242325818" };
    renderConfirmation();

    const link = screen.getByRole("link", { name: /send order to whatsapp/i });
    const href = link.getAttribute("href")!;
    const decoded = decodeURIComponent(href.split("?text=")[1]);
    expect(decoded).toContain("AP-20260101-ABC123");
    expect(decoded).toContain("Ama Owusu");
    expect(decoded).toContain("Faith Journal");
    expect(decoded).toContain("Grand Total");
  });
});
