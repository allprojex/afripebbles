import { describe, expect, it } from "vitest";
import { normalizeWhatsAppNumber, formatWhatsAppOrderMessage, buildWhatsAppOrderLink } from "./whatsapp";
import type { OrderWithItems } from "@workspace/api-client-react";

function baseOrder(overrides: Partial<OrderWithItems> = {}): OrderWithItems {
  return {
    id: 999, // never rendered — see the "never includes internal ids" test below
    orderReference: "AP-20260101-ABC123",
    customerName: "Ama Owusu",
    customerEmail: "ama@example.com",
    customerPhone: "233241234567",
    country: "Ghana",
    deliveryAddress: null,
    notes: null,
    currency: "GHS",
    subtotal: 100,
    shippingTotal: 10,
    discountTotal: 0,
    grandTotal: 110,
    paymentMethod: "mobile_money",
    paymentStatus: "pending",
    orderStatus: "pending_payment",
    paymentNote: "SECRET-INTERNAL-PAYMENT-NOTE",
    paidAt: null,
    trackingNumber: null,
    internalNotes: "SECRET-INTERNAL-ADMIN-NOTE",
    couponCode: null,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    items: [
      {
        id: 1,
        orderId: 999,
        productId: 5,
        productName: "Faith Journal",
        productType: "physical",
        variant: null,
        quantity: 2,
        unitPrice: 50,
        lineTotal: 100,
        shippingAmount: 10,
        isDigital: false,
        isPreorder: false,
        preorderFulfilmentText: null,
        createdAt: "2026-01-01T10:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("normalizeWhatsAppNumber — owner number formatting", () => {
  it("strips a leading + and spaces from a Ghana number", () => {
    expect(normalizeWhatsAppNumber("+233 24 123 4567")).toBe("233241234567");
  });

  it("strips a 00 international prefix", () => {
    expect(normalizeWhatsAppNumber("00233241234567")).toBe("233241234567");
  });

  it("strips dashes and parentheses", () => {
    expect(normalizeWhatsAppNumber("+233 (24) 123-4567")).toBe("233241234567");
  });

  it("strips a stray leading local zero on an otherwise-international number", () => {
    expect(normalizeWhatsAppNumber("0233241234567")).toBe("233241234567");
  });

  it("leaves an already-correct digits-only number unchanged", () => {
    expect(normalizeWhatsAppNumber("233241234567")).toBe("233241234567");
  });

  it("never leaves a + in the output", () => {
    expect(normalizeWhatsAppNumber("+491701234567")).not.toContain("+");
  });
});

describe("formatWhatsAppOrderMessage — content and privacy", () => {
  it("includes the required order summary fields", () => {
    const message = formatWhatsAppOrderMessage(baseOrder());
    expect(message).toContain("New AfriPebbles Order");
    expect(message).toContain("AP-20260101-ABC123");
    expect(message).toContain("Ama Owusu");
    expect(message).toContain("233241234567");
    expect(message).toContain("ama@example.com");
    expect(message).toContain("Ghana");
    expect(message).toContain("Faith Journal");
    expect(message).toContain("x2");
    expect(message).toContain("Subtotal");
    expect(message).toContain("Shipping");
    expect(message).toContain("Grand Total");
    expect(message).toContain("Mobile Money");
    expect(message).toContain("Pending");
  });

  it("lists every item for a multi-item cart with variants and preorders", () => {
    const order = baseOrder({
      items: [
        { id: 1, orderId: 999, productId: 1, productName: "Tote Bag", productType: "physical", variant: { label: "Color", option: "Sand" }, quantity: 1, unitPrice: 30, lineTotal: 30, shippingAmount: 5, isDigital: false, isPreorder: false, preorderFulfilmentText: null, createdAt: "2026-01-01T10:00:00.000Z" },
        { id: 2, orderId: 999, productId: 2, productName: "Christmas Ornament Set", productType: "physical", variant: null, quantity: 3, unitPrice: 20, lineTotal: 60, shippingAmount: 8, isDigital: false, isPreorder: true, preorderFulfilmentText: "2-3 months", createdAt: "2026-01-01T10:00:00.000Z" },
        { id: 3, orderId: 999, productId: 3, productName: "Gratitude Planner (PDF)", productType: "digital", variant: null, quantity: 1, unitPrice: 15, lineTotal: 15, shippingAmount: 0, isDigital: true, isPreorder: false, preorderFulfilmentText: null, createdAt: "2026-01-01T10:00:00.000Z" },
      ],
      subtotal: 105,
      shippingTotal: 13,
      grandTotal: 118,
    });
    const message = formatWhatsAppOrderMessage(order);
    expect(message).toContain("Tote Bag (Color: Sand)");
    expect(message).toContain("Christmas Ornament Set");
    expect(message).toContain("PRE-ORDER");
    expect(message).toContain("2-3 months");
    expect(message).toContain("Gratitude Planner (PDF)");
  });

  it("shows the discount line only when a discount was applied", () => {
    const withoutDiscount = formatWhatsAppOrderMessage(baseOrder({ discountTotal: 0 }));
    expect(withoutDiscount).not.toContain("Discount:");

    const withDiscount = formatWhatsAppOrderMessage(baseOrder({ discountTotal: 15, grandTotal: 95 }));
    expect(withDiscount).toContain("Discount:");
  });

  it("includes customer notes when present, and omits the line when absent", () => {
    const withNotes = formatWhatsAppOrderMessage(baseOrder({ notes: "Please gift-wrap this." }));
    expect(withNotes).toContain("Customer Notes: Please gift-wrap this.");

    const withoutNotes = formatWhatsAppOrderMessage(baseOrder({ notes: null }));
    expect(withoutNotes).not.toContain("Customer Notes");
  });

  it("includes the delivery address only when the order has one", () => {
    const withAddress = formatWhatsAppOrderMessage(baseOrder({ deliveryAddress: "12 Ring Road, Accra" }));
    expect(withAddress).toContain("12 Ring Road, Accra");

    const withoutAddress = formatWhatsAppOrderMessage(baseOrder({ deliveryAddress: null }));
    expect(withoutAddress).not.toContain("Delivery Address");
  });

  it("never includes internal notes, payment notes, or the internal database id", () => {
    const message = formatWhatsAppOrderMessage(baseOrder());
    expect(message).not.toContain("SECRET-INTERNAL-ADMIN-NOTE");
    expect(message).not.toContain("SECRET-INTERNAL-PAYMENT-NOTE");
    expect(message).not.toContain("999");
  });
});

describe("buildWhatsAppOrderLink — URL encoding and pure link generation", () => {
  it("produces a wa.me link with the normalized owner number and no + or raw spaces", () => {
    const link = buildWhatsAppOrderLink(baseOrder(), "+233 24 123 4567");
    expect(link).toMatch(/^https:\/\/wa\.me\/233241234567\?text=/);
    expect(link).not.toContain("+");
    expect(link).not.toMatch(/wa\.me\/233241234567 /);
  });

  it("round-trips the exact message through encodeURIComponent, surviving currency symbols, ampersands, and newlines", () => {
    const order = baseOrder({
      customerName: "Anna & Björn Müller-Åström",
      notes: "Call before delivery — 10% & no substitutions, please €5 discount noted.",
      currency: "EUR",
    });
    const link = buildWhatsAppOrderLink(order, "233241234567");
    const encoded = link.split("?text=")[1];
    const decoded = decodeURIComponent(encoded);

    expect(decoded).toContain("Anna & Björn Müller-Åström");
    expect(decoded).toContain("10% & no substitutions");
    expect(decoded).toContain("€5 discount");
    expect(decoded).toContain("\n");
    // The raw customer-name "&" must be encoded (%26) in the URL itself, not
    // left as a literal query-string separator, and no literal newline may
    // appear unescaped in the URL.
    expect(encoded).toContain("%26");
    expect(encoded).not.toContain("Anna & Björn");
    expect(encoded.includes("\n")).toBe(false);
  });

  it("is a pure, synchronous function — building the link never sends a network request or mutates the order", () => {
    const order = baseOrder();
    const before = JSON.stringify(order);
    const link = buildWhatsAppOrderLink(order, "233241234567");
    expect(typeof link).toBe("string");
    // Confirms order creation success is fully decoupled from this call:
    // the order object is untouched by generating (or never opening) the link.
    expect(JSON.stringify(order)).toBe(before);
  });
});
