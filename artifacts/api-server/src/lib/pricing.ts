import { inArray } from "drizzle-orm";
import { db, productsTable, couponsTable, type Product, type Coupon } from "@workspace/db";

export class OrderValidationError extends Error {}

export interface CartItemInput {
  productId: number;
  quantity: number;
  variant?: { label: string; option: string } | null;
}

export interface PricedItem {
  productId: number;
  productName: string;
  productType: "digital" | "physical";
  variant: { label: string; option: string } | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  shippingAmount: number;
  isDigital: boolean;
  isPreorder: boolean;
  preorderFulfilmentText: string | null;
}

export interface PricingResult {
  currency: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  grandTotal: number;
  items: PricedItem[];
  coupon: Coupon | null;
}

function isPubliclyVisibleNow(product: Product, now: Date): boolean {
  if (product.status === "published") return true;
  if (product.status === "scheduled" && product.scheduledAt) return product.scheduledAt <= now;
  return false;
}

function assertPreorderWindowOpen(product: Product, now: Date): void {
  if (product.availability !== "preorder") return;
  if (product.preorderOpensAt && now < product.preorderOpensAt) {
    throw new OrderValidationError(`"${product.title}" isn't open for pre-order yet.`);
  }
  if (product.preorderClosesAt && now > product.preorderClosesAt) {
    throw new OrderValidationError(`Pre-orders for "${product.title}" have closed.`);
  }
}

function resolveVariant(product: Product, requested: CartItemInput["variant"]): { label: string; option: string } | null {
  if (product.variants.length === 0) {
    if (requested) throw new OrderValidationError(`"${product.title}" doesn't have variant options.`);
    return null;
  }
  if (!requested) throw new OrderValidationError(`Please choose an option for "${product.title}".`);
  const group = product.variants.find((v) => v.label === requested.label);
  if (!group || !group.options.includes(requested.option)) {
    throw new OrderValidationError(`"${requested.option}" isn't a valid option for "${product.title}".`);
  }
  return { label: requested.label, option: requested.option };
}

function priceItem(product: Product, item: CartItemInput, now: Date): PricedItem {
  if (!Number.isInteger(item.quantity) || item.quantity < 1) {
    throw new OrderValidationError(`Invalid quantity for "${product.title}".`);
  }
  if (!isPubliclyVisibleNow(product, now)) {
    throw new OrderValidationError(`"${product.title}" is no longer available.`);
  }
  if (product.availability !== "available" && product.availability !== "preorder") {
    throw new OrderValidationError(`"${product.title}" isn't currently orderable.`);
  }
  assertPreorderWindowOpen(product, now);
  const variant = resolveVariant(product, item.variant);

  const isDigital = product.type === "digital";
  const isPreorder = product.availability === "preorder";
  const unitPrice = product.price;
  const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
  // Shipping is charged once per line item, not multiplied by quantity — a
  // fixed shipping amount configured on the product, not a per-unit rate.
  const shippingAmount = isDigital ? 0 : product.shippingAmount;

  return {
    productId: product.id,
    productName: product.title,
    productType: product.type as "digital" | "physical",
    variant,
    quantity: item.quantity,
    unitPrice,
    lineTotal,
    shippingAmount,
    isDigital,
    isPreorder,
    preorderFulfilmentText: isPreorder ? product.estimatedFulfilment : null,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function resolveCoupon(code: string, currency: string, subtotal: number, cartProductIds: number[], now: Date): Promise<{ coupon: Coupon; discount: number }> {
  const [coupon] = await db.select().from(couponsTable).where(inArray(couponsTable.code, [code.trim().toUpperCase()]));
  if (!coupon) throw new OrderValidationError("That coupon code isn't valid.");
  if (!coupon.isActive) throw new OrderValidationError("That coupon is no longer active.");
  if (coupon.activeFrom && now < coupon.activeFrom) throw new OrderValidationError("That coupon isn't active yet.");
  if (coupon.activeUntil && now > coupon.activeUntil) throw new OrderValidationError("That coupon has expired.");
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    throw new OrderValidationError("That coupon has reached its usage limit.");
  }
  if (coupon.minimumOrderAmount != null && subtotal < coupon.minimumOrderAmount) {
    throw new OrderValidationError(`That coupon requires a minimum order of ${coupon.minimumOrderAmount} ${currency}.`);
  }
  if (coupon.discountType === "fixed" && coupon.currency && coupon.currency !== currency) {
    throw new OrderValidationError("That coupon isn't valid for the selected currency.");
  }
  if (coupon.restrictedProductIds && coupon.restrictedProductIds.length > 0) {
    const allowed = new Set(coupon.restrictedProductIds);
    if (!cartProductIds.every((id) => allowed.has(id))) {
      throw new OrderValidationError("That coupon doesn't apply to the items in your cart.");
    }
  }

  const discount = coupon.discountType === "percentage" ? subtotal * (coupon.discountValue / 100) : coupon.discountValue;
  return { coupon, discount: round2(Math.max(0, discount)) };
}

/**
 * The single source of truth for order pricing. Re-fetches every product
 * fresh from the database and re-validates availability/preorder-window/
 * variant on every call — a client-submitted price, name, or currency is
 * never trusted. Used both by the quote-preview endpoint and (with the same
 * inputs) by order creation, so a customer never sees a total at checkout
 * that could differ from what actually gets charged.
 */
export async function calculateOrderTotals(cartItems: CartItemInput[], couponCode?: string | null, now: Date = new Date()): Promise<PricingResult> {
  if (cartItems.length === 0) throw new OrderValidationError("Your cart is empty.");

  const productIds = [...new Set(cartItems.map((i) => i.productId))];
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: PricedItem[] = [];
  let currency: string | null = null;
  for (const cartItem of cartItems) {
    const product = byId.get(cartItem.productId);
    if (!product) throw new OrderValidationError("One of the items in your cart is no longer available.");
    if (currency === null) currency = product.currency;
    else if (currency !== product.currency) throw new OrderValidationError("All items in an order must use the same currency.");
    items.push(priceItem(product, cartItem, now));
  }
  if (!currency) throw new OrderValidationError("Your cart is empty.");

  const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
  const shippingTotal = round2(items.reduce((sum, i) => sum + i.shippingAmount, 0));

  let coupon: Coupon | null = null;
  let discountTotal = 0;
  if (couponCode) {
    const resolved = await resolveCoupon(couponCode, currency, subtotal, [...new Set(items.map((i) => i.productId))], now);
    coupon = resolved.coupon;
    discountTotal = resolved.discount;
  }

  const grandTotal = Math.max(0, round2(subtotal + shippingTotal - discountTotal));

  return { currency, subtotal, shippingTotal, discountTotal, grandTotal, items, coupon };
}
