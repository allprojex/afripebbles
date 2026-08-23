import { inArray } from "drizzle-orm";
import {
  db,
  productsTable,
  couponsTable,
  productOptionGroupsTable,
  productOptionValuesTable,
  productVarietiesTable,
  type Product,
  type Coupon,
  type ProductOptionGroup,
  type ProductOptionValue,
  type ProductVariety,
} from "@workspace/db";

export class OrderValidationError extends Error {}

export interface CartSelectionInput {
  groupId: number;
  valueId: number;
}

export interface CartItemInput {
  productId: number;
  quantity: number;
  /** Legacy single-option-group path — only valid for products with zero option groups/varieties. */
  variant?: { label: string; option: string } | null;
  varietyId?: number | null;
  selections?: CartSelectionInput[];
}

export interface PricedSelection {
  groupLabel: string;
  valueLabel: string;
  priceAdjustment: number;
  sku: string | null;
}

export interface PricedItem {
  productId: number;
  productName: string;
  productType: "digital" | "physical";
  variant: { label: string; option: string } | null;
  varietyId: number | null;
  varietyName: string | null;
  varietyDescription: string | null;
  sku: string | null;
  selections: PricedSelection[] | null;
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

interface ProductOptions {
  groups: (ProductOptionGroup & { values: ProductOptionValue[] })[];
  varieties: ProductVariety[];
}

function isPubliclyVisibleNow(product: Product, now: Date): boolean {
  if (product.status === "published") return true;
  if (product.status === "scheduled" && product.scheduledAt) return product.scheduledAt <= now;
  return false;
}

/**
 * Preorder windows are product-level only in V1 — a variety may override
 * availability to/from "preorder" but never the open/close dates, which
 * always come from the product row. Documented simplification.
 */
function assertPreorderWindowOpen(product: Product, effectiveAvailability: string, now: Date): void {
  if (effectiveAvailability !== "preorder") return;
  if (product.preorderOpensAt && now < product.preorderOpensAt) {
    throw new OrderValidationError(`"${product.title}" isn't open for pre-order yet.`);
  }
  if (product.preorderClosesAt && now > product.preorderClosesAt) {
    throw new OrderValidationError(`Pre-orders for "${product.title}" have closed.`);
  }
}

/** Unchanged legacy single-option-group resolution — only reached for products with zero rows in the new option/variety tables. */
function resolveLegacyVariant(product: Product, requested: CartItemInput["variant"]): { label: string; option: string } | null {
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

/**
 * Validates a multi-option-group/variety selection against the product's
 * currently-active groups/values/varieties. Rejects fabricated ids, values
 * belonging to a different product/group, inactive rows, and missing
 * required groups. Never trusts anything the client sends beyond the ids.
 */
function resolveNewSelections(
  product: Product,
  options: ProductOptions,
  item: CartItemInput,
): { variety: ProductVariety | null; selections: PricedSelection[] } {
  const activeVarieties = options.varieties.filter((v) => v.isActive);
  let variety: ProductVariety | null = null;
  if (activeVarieties.length > 0) {
    if (item.varietyId == null) throw new OrderValidationError(`Please choose an option for "${product.title}".`);
    const found = activeVarieties.find((v) => v.id === item.varietyId);
    if (!found) throw new OrderValidationError(`That option isn't available for "${product.title}".`);
    variety = found;
  } else if (item.varietyId != null) {
    throw new OrderValidationError(`"${product.title}" doesn't have that option.`);
  }

  const activeGroups = options.groups.filter((g) => g.isActive);
  const activeGroupIds = new Set(activeGroups.map((g) => g.id));
  const providedSelections = item.selections ?? [];

  const byGroup = new Map<number, CartSelectionInput>();
  for (const sel of providedSelections) {
    if (!activeGroupIds.has(sel.groupId)) throw new OrderValidationError(`Invalid option selected for "${product.title}".`);
    if (byGroup.has(sel.groupId)) throw new OrderValidationError(`Only one choice is allowed per option for "${product.title}".`);
    byGroup.set(sel.groupId, sel);
  }

  for (const group of activeGroups) {
    if (group.required && !byGroup.has(group.id)) {
      throw new OrderValidationError(`Please choose ${group.label} for "${product.title}".`);
    }
  }

  const selections: PricedSelection[] = [];
  for (const group of activeGroups) {
    const sel = byGroup.get(group.id);
    if (!sel) continue; // optional group left unselected
    const value = group.values.find((v) => v.id === sel.valueId && v.isActive);
    if (!value) throw new OrderValidationError(`Invalid option selected for "${product.title}".`);
    selections.push({ groupLabel: group.label, valueLabel: value.label, priceAdjustment: value.priceAdjustment, sku: value.sku });
  }

  return { variety, selections };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function priceItem(product: Product, options: ProductOptions, item: CartItemInput, now: Date): PricedItem {
  if (!Number.isInteger(item.quantity) || item.quantity < 1) {
    throw new OrderValidationError(`Invalid quantity for "${product.title}".`);
  }
  if (!isPubliclyVisibleNow(product, now)) {
    throw new OrderValidationError(`"${product.title}" is no longer available.`);
  }

  const usesNewModel = options.groups.length > 0 || options.varieties.length > 0;

  let variant: { label: string; option: string } | null = null;
  let variety: ProductVariety | null = null;
  let selections: PricedSelection[] = [];

  if (usesNewModel) {
    if (item.variant) throw new OrderValidationError(`"${product.title}" doesn't have variant options.`);
    const resolved = resolveNewSelections(product, options, item);
    variety = resolved.variety;
    selections = resolved.selections;
  } else {
    if (item.varietyId != null || (item.selections && item.selections.length > 0)) {
      throw new OrderValidationError(`"${product.title}" doesn't have that option.`);
    }
    variant = resolveLegacyVariant(product, item.variant ?? null);
  }

  const effectiveAvailability = variety?.availabilityOverride ?? product.availability;
  if (effectiveAvailability !== "available" && effectiveAvailability !== "preorder") {
    throw new OrderValidationError(`"${product.title}" isn't currently orderable.`);
  }
  assertPreorderWindowOpen(product, effectiveAvailability, now);

  const isDigital = product.type === "digital";
  const isPreorder = effectiveAvailability === "preorder";
  const priceAdjustmentTotal = selections.reduce((sum, s) => sum + s.priceAdjustment, 0);
  const unitPrice = round2((variety?.priceOverride ?? product.price) + priceAdjustmentTotal);
  // Shipping is charged once per line item, not multiplied by quantity — unchanged from before.
  const shippingAmount = isDigital ? 0 : (variety?.shippingAmountOverride ?? product.shippingAmount);
  const lineTotal = round2(unitPrice * item.quantity);

  return {
    productId: product.id,
    productName: product.title,
    productType: product.type as "digital" | "physical",
    variant,
    varietyId: variety?.id ?? null,
    varietyName: variety?.name ?? null,
    varietyDescription: variety?.description ?? null,
    sku: variety?.sku ?? null,
    selections: usesNewModel ? selections : null,
    quantity: item.quantity,
    unitPrice,
    lineTotal,
    shippingAmount,
    isDigital,
    isPreorder,
    preorderFulfilmentText: isPreorder ? product.estimatedFulfilment : null,
  };
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
 * (and its option groups/values/varieties) fresh from the database and
 * re-validates availability/preorder-window/selection on every call — a
 * client-submitted price, name, currency, or option label is never trusted.
 * Used both by the quote-preview endpoint and (with the same inputs) by
 * order creation, so a customer never sees a total at checkout that could
 * differ from what actually gets charged.
 */
export async function calculateOrderTotals(cartItems: CartItemInput[], couponCode?: string | null, now: Date = new Date()): Promise<PricingResult> {
  if (cartItems.length === 0) throw new OrderValidationError("Your cart is empty.");

  const productIds = [...new Set(cartItems.map((i) => i.productId))];
  const products = await db.select().from(productsTable).where(inArray(productsTable.id, productIds));
  const byId = new Map(products.map((p) => [p.id, p]));

  const groups = productIds.length ? await db.select().from(productOptionGroupsTable).where(inArray(productOptionGroupsTable.productId, productIds)) : [];
  const groupIds = groups.map((g) => g.id);
  const values = groupIds.length
    ? await db.select().from(productOptionValuesTable).where(inArray(productOptionValuesTable.groupId, groupIds))
    : [];
  const varieties = productIds.length ? await db.select().from(productVarietiesTable).where(inArray(productVarietiesTable.productId, productIds)) : [];

  const valuesByGroup = new Map<number, ProductOptionValue[]>();
  for (const v of values) {
    const arr = valuesByGroup.get(v.groupId) ?? [];
    arr.push(v);
    valuesByGroup.set(v.groupId, arr);
  }
  const groupsByProduct = new Map<number, (ProductOptionGroup & { values: ProductOptionValue[] })[]>();
  for (const g of groups) {
    const arr = groupsByProduct.get(g.productId) ?? [];
    arr.push({ ...g, values: valuesByGroup.get(g.id) ?? [] });
    groupsByProduct.set(g.productId, arr);
  }
  const varietiesByProduct = new Map<number, ProductVariety[]>();
  for (const v of varieties) {
    const arr = varietiesByProduct.get(v.productId) ?? [];
    arr.push(v);
    varietiesByProduct.set(v.productId, arr);
  }

  const items: PricedItem[] = [];
  let currency: string | null = null;
  for (const cartItem of cartItems) {
    const product = byId.get(cartItem.productId);
    if (!product) throw new OrderValidationError("One of the items in your cart is no longer available.");
    if (currency === null) currency = product.currency;
    else if (currency !== product.currency) throw new OrderValidationError("All items in an order must use the same currency.");
    const options: ProductOptions = {
      groups: groupsByProduct.get(product.id) ?? [],
      varieties: varietiesByProduct.get(product.id) ?? [],
    };
    items.push(priceItem(product, options, cartItem, now));
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
