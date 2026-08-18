import type { OrderWithItems } from "@workspace/api-client-react";
import { formatCurrency } from "./currency";

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  paypal: "PayPal",
  mobile_money: "Mobile Money",
  bank_transfer: "Bank Transfer",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

/**
 * V1 uses WhatsApp click-to-chat, not an automated provider — this only ever
 * normalizes the *owner's* configured number (the wa.me target), never a
 * customer's. Strips +, spaces, dashes; converts a "00" international
 * prefix and a stray leading local "0" to the digits-only, no-leading-zero
 * form wa.me requires.
 */
export function normalizeWhatsAppNumber(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length >= 10) {
    digits = digits.slice(1);
  }
  return digits;
}

/**
 * Builds the exact order summary sent to the owner over WhatsApp.
 * Deliberately never includes: database/Supabase ids, internal admin notes,
 * payment references/tokens, or digital-download URLs.
 */
export function formatWhatsAppOrderMessage(order: OrderWithItems): string {
  const lines: string[] = [];

  lines.push("*New AfriPebbles Order*");
  lines.push("");
  lines.push(`Order Reference: ${order.orderReference}`);
  lines.push(`Date: ${new Date(order.createdAt).toLocaleString()}`);
  lines.push("");
  lines.push(`Customer: ${order.customerName}`);
  lines.push(`Phone: ${order.customerPhone}`);
  lines.push(`Email: ${order.customerEmail}`);
  lines.push(`Country: ${order.country}`);
  if (order.deliveryAddress) lines.push(`Delivery Address: ${order.deliveryAddress}`);
  lines.push("");
  lines.push("Items:");
  for (const item of order.items) {
    const variantText = item.variant ? ` (${item.variant.label}: ${item.variant.option})` : "";
    const preorderText = item.isPreorder ? ` [PRE-ORDER${item.preorderFulfilmentText ? ` — ${item.preorderFulfilmentText}` : ""}]` : "";
    lines.push(
      `- ${item.productName}${variantText} x${item.quantity} @ ${formatCurrency(item.unitPrice, order.currency)} = ${formatCurrency(item.lineTotal, order.currency)}${preorderText}`,
    );
  }
  lines.push("");
  lines.push(`Subtotal: ${formatCurrency(order.subtotal, order.currency)}`);
  lines.push(`Shipping: ${formatCurrency(order.shippingTotal, order.currency)}`);
  if (order.discountTotal > 0) lines.push(`Discount: -${formatCurrency(order.discountTotal, order.currency)}`);
  lines.push(`Grand Total: ${formatCurrency(order.grandTotal, order.currency)} (${order.currency})`);
  lines.push("");
  lines.push(`Payment Method: ${PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}`);
  lines.push(`Payment Status: ${PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}`);
  if (order.notes) {
    lines.push("");
    lines.push(`Customer Notes: ${order.notes}`);
  }

  return lines.join("\n");
}

/**
 * The order must already be durably saved before this is ever called — this
 * function has no side effects and makes no network request; it's pure
 * string-building, so the order's existence never depends on the customer
 * (or admin) actually opening/sending the resulting link.
 */
export function buildWhatsAppOrderLink(order: OrderWithItems, ownerNumber: string): string {
  const normalized = normalizeWhatsAppNumber(ownerNumber);
  const message = formatWhatsAppOrderMessage(order);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
