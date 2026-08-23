import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { eq, like, and } from "drizzle-orm";
import request from "supertest";
import { db, productsTable, ordersTable, orderItemsTable, couponsTable, productOptionGroupsTable, productOptionValuesTable, productVarietiesTable } from "@workspace/db";
import { calculateOrderTotals, OrderValidationError } from "../lib/pricing";
import { generateOrderReference } from "../lib/orderReference";
import app from "../app";

const { createSignedUrlMock } = vi.hoisted(() => ({ createSignedUrlMock: vi.fn() }));

vi.mock("../lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    storage: {
      from: () => ({ createSignedUrl: createSignedUrlMock }),
    },
  }),
}));

const TEST_PREFIX = "__test-orders-";
const TEST_EMAIL = `${TEST_PREFIX}customer@example.com`;

async function cleanupTestData() {
  const testProducts = await db.select({ id: productsTable.id }).from(productsTable).where(like(productsTable.slug, `${TEST_PREFIX}%`));
  for (const p of testProducts) {
    await db.delete(orderItemsTable).where(eq(orderItemsTable.productId, p.id));
  }
  const testOrders = await db.select({ id: ordersTable.id }).from(ordersTable).where(like(ordersTable.customerEmail, `${TEST_PREFIX}%`));
  for (const o of testOrders) {
    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
  }
  await db.delete(ordersTable).where(like(ordersTable.customerEmail, `${TEST_PREFIX}%`));
  await db.delete(productsTable).where(like(productsTable.slug, `${TEST_PREFIX}%`));
  await db.delete(couponsTable).where(like(couponsTable.code, `${TEST_PREFIX.toUpperCase()}%`));
}

function baseProduct(overrides: Record<string, unknown> = {}) {
  return {
    slug: `${TEST_PREFIX}${randomUUID()}`,
    title: "Test Product",
    description: "For order pricing tests.",
    price: 10,
    currency: "EUR",
    type: "digital",
    availability: "available",
    stockStatus: "in_stock",
    status: "published",
    shippingAmount: 0,
    ...overrides,
  };
}

describe("calculateOrderTotals — server-side pricing engine", () => {
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  it("computes subtotal/shipping/grand total for a single digital item (shipping = 0)", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 12, type: "digital" })).returning();
    const result = await calculateOrderTotals([{ productId: product.id, quantity: 2 }]);
    expect(result.subtotal).toBe(24);
    expect(result.shippingTotal).toBe(0);
    expect(result.grandTotal).toBe(24);
    expect(result.items[0].isDigital).toBe(true);
  });

  it("charges fixed shipping once per physical line, not multiplied by quantity", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 20, type: "physical", shippingAmount: 5 })).returning();
    const result = await calculateOrderTotals([{ productId: product.id, quantity: 3 }]);
    expect(result.subtotal).toBe(60);
    expect(result.shippingTotal).toBe(5);
    expect(result.grandTotal).toBe(65);
  });

  it("sums totals correctly for a mixed digital + physical cart", async () => {
    const [digital] = await db.insert(productsTable).values(baseProduct({ price: 10, type: "digital" })).returning();
    const [physical] = await db.insert(productsTable).values(baseProduct({ price: 15, type: "physical", shippingAmount: 4 })).returning();
    const result = await calculateOrderTotals([
      { productId: digital.id, quantity: 1 },
      { productId: physical.id, quantity: 2 },
    ]);
    expect(result.subtotal).toBe(40); // 10 + 15*2
    expect(result.shippingTotal).toBe(4); // only the physical line
    expect(result.grandTotal).toBe(44);
  });

  it("rejects a draft product", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ status: "draft" })).returning();
    await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }])).rejects.toThrow(OrderValidationError);
  });

  it("rejects an archived product", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ status: "archived" })).returning();
    await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }])).rejects.toThrow(OrderValidationError);
  });

  it("rejects a coming_soon / out_of_stock product", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ availability: "coming_soon" })).returning();
    await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }])).rejects.toThrow(OrderValidationError);
  });

  it("rejects a preorder item before its preorder window opens", async () => {
    const [product] = await db
      .insert(productsTable)
      .values(baseProduct({ availability: "preorder", preorderOpensAt: new Date(Date.now() + 86_400_000) }))
      .returning();
    await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }])).rejects.toThrow(OrderValidationError);
  });

  it("rejects a preorder item after its preorder window closes", async () => {
    const [product] = await db
      .insert(productsTable)
      .values(baseProduct({ availability: "preorder", preorderClosesAt: new Date(Date.now() - 86_400_000) }))
      .returning();
    await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }])).rejects.toThrow(OrderValidationError);
  });

  it("accepts a preorder item inside its window and snapshots the fulfilment text", async () => {
    const [product] = await db
      .insert(productsTable)
      .values(
        baseProduct({
          availability: "preorder",
          preorderOpensAt: new Date(Date.now() - 86_400_000),
          preorderClosesAt: new Date(Date.now() + 86_400_000),
          estimatedFulfilment: "2-3 months",
        }),
      )
      .returning();
    const result = await calculateOrderTotals([{ productId: product.id, quantity: 1 }]);
    expect(result.items[0].isPreorder).toBe(true);
    expect(result.items[0].preorderFulfilmentText).toBe("2-3 months");
  });

  it("rejects a missing/invalid variant selection when the product has variants", async () => {
    const [product] = await db
      .insert(productsTable)
      .values(baseProduct({ variants: [{ label: "Size", options: ["S", "M"] }] }))
      .returning();
    await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }])).rejects.toThrow(OrderValidationError);
    await expect(
      calculateOrderTotals([{ productId: product.id, quantity: 1, variant: { label: "Size", option: "XL" } }]),
    ).rejects.toThrow(OrderValidationError);
  });

  it("accepts a valid variant selection", async () => {
    const [product] = await db
      .insert(productsTable)
      .values(baseProduct({ variants: [{ label: "Size", options: ["S", "M"] }] }))
      .returning();
    const result = await calculateOrderTotals([{ productId: product.id, quantity: 1, variant: { label: "Size", option: "M" } }]);
    expect(result.items[0].variant).toEqual({ label: "Size", option: "M" });
  });

  it("never trusts a client-submitted price — only the server-side product price is used", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 10 })).returning();
    // @ts-expect-error deliberately passing an extra field a hostile client might send
    const result = await calculateOrderTotals([{ productId: product.id, quantity: 1, price: 0.01 }]);
    expect(result.items[0].unitPrice).toBe(10);
    expect(result.subtotal).toBe(10);
  });

  describe("coupons", () => {
    it("applies a percentage discount", async () => {
      const [product] = await db.insert(productsTable).values(baseProduct({ price: 100 })).returning();
      const [coupon] = await db
        .insert(couponsTable)
        .values({ code: `${TEST_PREFIX.toUpperCase()}PCT10`, discountType: "percentage", discountValue: 10, isActive: true })
        .returning();
      const result = await calculateOrderTotals([{ productId: product.id, quantity: 1 }], coupon.code);
      expect(result.discountTotal).toBe(10);
      expect(result.grandTotal).toBe(90);
    });

    it("applies a fixed discount", async () => {
      const [product] = await db.insert(productsTable).values(baseProduct({ price: 100, currency: "EUR" })).returning();
      const [coupon] = await db
        .insert(couponsTable)
        .values({ code: `${TEST_PREFIX.toUpperCase()}FIXED5`, discountType: "fixed", discountValue: 5, currency: "EUR", isActive: true })
        .returning();
      const result = await calculateOrderTotals([{ productId: product.id, quantity: 1 }], coupon.code);
      expect(result.discountTotal).toBe(5);
      expect(result.grandTotal).toBe(95);
    });

    it("rejects an expired coupon", async () => {
      const [product] = await db.insert(productsTable).values(baseProduct({ price: 100 })).returning();
      const [coupon] = await db
        .insert(couponsTable)
        .values({
          code: `${TEST_PREFIX.toUpperCase()}EXPIRED`,
          discountType: "percentage",
          discountValue: 10,
          isActive: true,
          activeUntil: new Date(Date.now() - 86_400_000),
        })
        .returning();
      await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }], coupon.code)).rejects.toThrow(OrderValidationError);
    });

    it("rejects a coupon that has reached its usage limit", async () => {
      const [product] = await db.insert(productsTable).values(baseProduct({ price: 100 })).returning();
      const [coupon] = await db
        .insert(couponsTable)
        .values({ code: `${TEST_PREFIX.toUpperCase()}MAXED`, discountType: "percentage", discountValue: 10, isActive: true, usageLimit: 1, usageCount: 1 })
        .returning();
      await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }], coupon.code)).rejects.toThrow(OrderValidationError);
    });

    it("rejects a coupon below its minimum order amount", async () => {
      const [product] = await db.insert(productsTable).values(baseProduct({ price: 10 })).returning();
      const [coupon] = await db
        .insert(couponsTable)
        .values({
          code: `${TEST_PREFIX.toUpperCase()}MIN50`,
          discountType: "percentage",
          discountValue: 10,
          isActive: true,
          minimumOrderAmount: 50,
        })
        .returning();
      await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }], coupon.code)).rejects.toThrow(OrderValidationError);
    });

    it("rejects a coupon restricted to a different product", async () => {
      const [product] = await db.insert(productsTable).values(baseProduct({ price: 100 })).returning();
      const [otherProduct] = await db.insert(productsTable).values(baseProduct({ price: 100 })).returning();
      const [coupon] = await db
        .insert(couponsTable)
        .values({
          code: `${TEST_PREFIX.toUpperCase()}RESTRICT`,
          discountType: "percentage",
          discountValue: 10,
          isActive: true,
          restrictedProductIds: [otherProduct.id],
        })
        .returning();
      await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }], coupon.code)).rejects.toThrow(OrderValidationError);
    });
  });
});

describe("calculateOrderTotals — multi-option-group/variety engine", () => {
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  async function insertGroup(productId: number, overrides: Record<string, unknown> = {}) {
    const [group] = await db
      .insert(productOptionGroupsTable)
      .values({ productId, key: "size", label: "Size", required: true, isActive: true, ...overrides })
      .returning();
    return group;
  }

  async function insertValue(groupId: number, overrides: Record<string, unknown> = {}) {
    const [value] = await db
      .insert(productOptionValuesTable)
      .values({ groupId, label: "Medium", value: "m", priceAdjustment: 0, isActive: true, ...overrides })
      .returning();
    return value;
  }

  async function insertVariety(productId: number, overrides: Record<string, unknown> = {}) {
    const [variety] = await db
      .insert(productVarietiesTable)
      .values({ productId, name: "Burgundy set", isActive: true, ...overrides })
      .returning();
    return variety;
  }

  it("accepts a valid option-group selection and applies its price adjustment", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 20, type: "physical", shippingAmount: 3 })).returning();
    const group = await insertGroup(product.id);
    await insertValue(group.id, { label: "Small", value: "s", priceAdjustment: 0 });
    const large = await insertValue(group.id, { label: "Large", value: "l", priceAdjustment: 5 });

    const result = await calculateOrderTotals([{ productId: product.id, quantity: 2, selections: [{ groupId: group.id, valueId: large.id }] }]);
    expect(result.items[0].unitPrice).toBe(25); // 20 base + 5 adjustment
    expect(result.items[0].lineTotal).toBe(50);
    expect(result.items[0].selections).toEqual([{ groupLabel: "Size", valueLabel: "Large", priceAdjustment: 5, sku: null }]);
  });

  it("rejects a missing required group", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct()).returning();
    const group = await insertGroup(product.id, { required: true });
    await insertValue(group.id);
    await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }])).rejects.toThrow(OrderValidationError);
  });

  it("rejects a fabricated valueId that doesn't belong to the group", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct()).returning();
    const group = await insertGroup(product.id);
    await insertValue(group.id);
    await expect(
      calculateOrderTotals([{ productId: product.id, quantity: 1, selections: [{ groupId: group.id, valueId: 999999999 }] }]),
    ).rejects.toThrow(OrderValidationError);
  });

  it("rejects a fabricated groupId that doesn't belong to the product", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct()).returning();
    const [otherProduct] = await db.insert(productsTable).values(baseProduct()).returning();
    const otherGroup = await insertGroup(otherProduct.id);
    const otherValue = await insertValue(otherGroup.id);
    await expect(
      calculateOrderTotals([{ productId: product.id, quantity: 1, selections: [{ groupId: otherGroup.id, valueId: otherValue.id }] }]),
    ).rejects.toThrow(OrderValidationError);
  });

  it("rejects an inactive option value even if the id is otherwise valid", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct()).returning();
    const group = await insertGroup(product.id);
    const value = await insertValue(group.id, { isActive: false });
    await expect(
      calculateOrderTotals([{ productId: product.id, quantity: 1, selections: [{ groupId: group.id, valueId: value.id }] }]),
    ).rejects.toThrow(OrderValidationError);
  });

  it("rejects an inactive group's leftover values as if the group weren't there", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct()).returning();
    const group = await insertGroup(product.id, { isActive: false, required: true });
    const value = await insertValue(group.id);
    // The inactive group isn't required, so no selection is needed — but a client trying to submit one is rejected as fabricated.
    const result = await calculateOrderTotals([{ productId: product.id, quantity: 1 }]);
    expect(result.items[0].selections).toEqual([]);
    await expect(
      calculateOrderTotals([{ productId: product.id, quantity: 1, selections: [{ groupId: group.id, valueId: value.id }] }]),
    ).rejects.toThrow(OrderValidationError);
  });

  it("legacy `variant` field is rejected once a product has option groups", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct()).returning();
    await insertGroup(product.id, { required: false });
    await expect(
      calculateOrderTotals([{ productId: product.id, quantity: 1, variant: { label: "Size", option: "M" } }]),
    ).rejects.toThrow(OrderValidationError);
  });

  it("requires a varietyId when the product has active varieties, and rejects a fabricated one", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct()).returning();
    await insertVariety(product.id);
    await expect(calculateOrderTotals([{ productId: product.id, quantity: 1 }])).rejects.toThrow(OrderValidationError);
    await expect(calculateOrderTotals([{ productId: product.id, quantity: 1, varietyId: 999999999 }])).rejects.toThrow(OrderValidationError);
  });

  it("rejects an inactive variety", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct()).returning();
    const variety = await insertVariety(product.id, { isActive: false });
    await expect(calculateOrderTotals([{ productId: product.id, quantity: 1, varietyId: variety.id }])).rejects.toThrow(OrderValidationError);
  });

  it("a variety's priceOverride replaces the product base price, and combines with option adjustments", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 20 })).returning();
    const variety = await insertVariety(product.id, { name: "Burgundy set", priceOverride: 30, sku: "BAUBLE-BURG" });
    const group = await insertGroup(product.id);
    const value = await insertValue(group.id, { label: "Large", priceAdjustment: 4 });

    const result = await calculateOrderTotals([
      { productId: product.id, quantity: 3, varietyId: variety.id, selections: [{ groupId: group.id, valueId: value.id }] },
    ]);
    expect(result.items[0].unitPrice).toBe(34); // 30 override + 4 adjustment, base price of 20 ignored
    expect(result.items[0].lineTotal).toBe(102);
    expect(result.items[0].varietyName).toBe("Burgundy set");
    expect(result.items[0].sku).toBe("BAUBLE-BURG");
  });

  it("a variety's shippingAmountOverride replaces the product's shipping amount", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ type: "physical", shippingAmount: 5 })).returning();
    const variety = await insertVariety(product.id, { shippingAmountOverride: 12 });
    const result = await calculateOrderTotals([{ productId: product.id, quantity: 2, varietyId: variety.id }]);
    expect(result.items[0].shippingAmount).toBe(12);
  });

  it("multiple different combinations from the same product price independently", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 20 })).returning();
    const burgundy = await insertVariety(product.id, { name: "Burgundy", priceOverride: 25, displayOrder: 0 });
    const white = await insertVariety(product.id, { name: "White", priceOverride: 22, displayOrder: 1 });
    const group = await insertGroup(product.id);
    const large = await insertValue(group.id, { label: "Large", value: "l", priceAdjustment: 3 });
    const medium = await insertValue(group.id, { label: "Medium", value: "m", priceAdjustment: 0 });

    const result = await calculateOrderTotals([
      { productId: product.id, quantity: 2, varietyId: burgundy.id, selections: [{ groupId: group.id, valueId: large.id }] },
      { productId: product.id, quantity: 1, varietyId: white.id, selections: [{ groupId: group.id, valueId: medium.id }] },
    ]);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].unitPrice).toBe(28); // 25 + 3
    expect(result.items[1].unitPrice).toBe(22); // 22 + 0
    expect(result.subtotal).toBe(78); // 28*2 + 22*1
  });
});

describe("POST /api/orders — multi-selection order snapshot", () => {
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  it("persists variety/selections snapshot on the order item, surviving later product edits", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 20, type: "physical", shippingAmount: 2 })).returning();
    const [variety] = await db.insert(productVarietiesTable).values({ productId: product.id, name: "Burgundy set", priceOverride: 25 }).returning();
    const [group] = await db.insert(productOptionGroupsTable).values({ productId: product.id, key: "size", label: "Size", required: true }).returning();
    const [value] = await db.insert(productOptionValuesTable).values({ groupId: group.id, label: "Large", value: "l", priceAdjustment: 3 }).returning();

    const res = await request(app)
      .post("/api/orders")
      .send({
        customerName: "Test Customer",
        customerEmail: TEST_EMAIL,
        customerPhone: "233241234567",
        country: "Ghana",
        deliveryAddress: "1 Test Street",
        paymentMethod: "mobile_money",
        items: [{ productId: product.id, quantity: 2, varietyId: variety.id, selections: [{ groupId: group.id, valueId: value.id }] }],
        consent: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.items[0].varietyName).toBe("Burgundy set");
    expect(res.body.items[0].selections).toEqual([{ groupLabel: "Size", valueLabel: "Large", priceAdjustment: 3, sku: null }]);
    expect(res.body.items[0].unitPrice).toBe(28);

    // Now edit the product/variety/option away entirely — the persisted order item must be unaffected.
    await db.delete(productVarietiesTable).where(eq(productVarietiesTable.id, variety.id));
    await db.delete(productOptionGroupsTable).where(eq(productOptionGroupsTable.id, group.id));
    await db.update(productsTable).set({ title: "Renamed after order" }).where(eq(productsTable.id, product.id));

    const [orderItem] = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, res.body.id));
    expect(orderItem.varietyName).toBe("Burgundy set");
    expect(orderItem.selections).toEqual([{ groupLabel: "Size", valueLabel: "Large", priceAdjustment: 3, sku: null }]);
    expect(orderItem.productName).toBe("Test Product"); // productName snapshot unaffected by the later rename
  });
});

describe("generateOrderReference", () => {
  it("matches the AP-YYYYMMDD-XXXXXX format using only unambiguous characters", () => {
    const ref = generateOrderReference();
    expect(ref).toMatch(/^AP-\d{8}-[2-9A-HJ-NP-Z]{6}$/);
  });

  it("generates unique references across many calls", () => {
    const refs = new Set(Array.from({ length: 500 }, () => generateOrderReference()));
    expect(refs.size).toBe(500);
  });
});

describe("POST /api/orders — guest checkout", () => {
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  it("creates an order for a digital-only cart without requiring a delivery address", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 10, type: "digital" })).returning();

    const res = await request(app)
      .post("/api/orders")
      .send({
        customerName: "Test Customer",
        customerEmail: TEST_EMAIL,
        customerPhone: "233241234567",
        country: "Ghana",
        paymentMethod: "mobile_money",
        items: [{ productId: product.id, quantity: 1 }],
        consent: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.orderReference).toMatch(/^AP-/);
    expect(res.body.grandTotal).toBe(10);
    expect(res.body.paymentStatus).toBe("pending");
    expect(res.body.orderStatus).toBe("pending_payment");
    expect(res.body.items).toHaveLength(1);
  });

  it("rejects a physical-item order with no delivery address", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 10, type: "physical", shippingAmount: 3 })).returning();

    const res = await request(app)
      .post("/api/orders")
      .send({
        customerName: "Test Customer",
        customerEmail: TEST_EMAIL,
        customerPhone: "233241234567",
        country: "Ghana",
        paymentMethod: "bank_transfer",
        items: [{ productId: product.id, quantity: 1 }],
        consent: true,
      });

    expect(res.status).toBe(400);
  });

  it("rejects order creation without consent", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 10, type: "digital" })).returning();

    const res = await request(app)
      .post("/api/orders")
      .send({
        customerName: "Test Customer",
        customerEmail: TEST_EMAIL,
        customerPhone: "233241234567",
        country: "Ghana",
        paymentMethod: "paypal",
        items: [{ productId: product.id, quantity: 1 }],
        consent: false,
      });

    expect(res.status).toBe(400);
  });

  it("rejects an unavailable product and never creates an order", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ status: "draft" })).returning();

    const res = await request(app)
      .post("/api/orders")
      .send({
        customerName: "Test Customer",
        customerEmail: TEST_EMAIL,
        customerPhone: "233241234567",
        country: "Ghana",
        paymentMethod: "paypal",
        items: [{ productId: product.id, quantity: 1 }],
        consent: true,
      });

    expect(res.status).toBe(400);
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.customerEmail, TEST_EMAIL));
    expect(orders).toHaveLength(0);
  });
});

describe("POST /api/orders/track — public tracking privacy", () => {
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  it("returns only the limited public view for a matching reference + email, never internal fields", async () => {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 10, type: "digital" })).returning();
    const [order] = await db
      .insert(ordersTable)
      .values({
        orderReference: generateOrderReference(),
        customerName: "Test Customer",
        customerEmail: TEST_EMAIL,
        customerPhone: "233241234567",
        country: "Ghana",
        currency: "EUR",
        subtotal: 10,
        shippingTotal: 0,
        discountTotal: 0,
        grandTotal: 10,
        paymentMethod: "paypal",
        internalNotes: "SECRET admin-only note",
        paymentNote: "SECRET payment reference",
      })
      .returning();
    await db.insert(orderItemsTable).values({
      orderId: order.id,
      productId: product.id,
      productName: product.title,
      productType: "digital",
      quantity: 1,
      unitPrice: 10,
      lineTotal: 10,
      isDigital: true,
    });

    const res = await request(app).post("/api/orders/track").send({ orderReference: order.orderReference, email: TEST_EMAIL });
    expect(res.status).toBe(200);
    expect(res.body.orderReference).toBe(order.orderReference);
    expect(res.body).not.toHaveProperty("id");
    expect(res.body).not.toHaveProperty("internalNotes");
    expect(res.body).not.toHaveProperty("paymentNote");
    expect(res.body).not.toHaveProperty("customerEmail");
    expect(res.body).not.toHaveProperty("customerPhone");
    expect(JSON.stringify(res.body)).not.toContain("SECRET");
  });

  it("rejects a lookup with the wrong email", async () => {
    const [order] = await db
      .insert(ordersTable)
      .values({
        orderReference: generateOrderReference(),
        customerName: "Test Customer",
        customerEmail: TEST_EMAIL,
        customerPhone: "233241234567",
        country: "Ghana",
        currency: "EUR",
        subtotal: 10,
        shippingTotal: 0,
        discountTotal: 0,
        grandTotal: 10,
        paymentMethod: "paypal",
      })
      .returning();

    const res = await request(app).post("/api/orders/track").send({ orderReference: order.orderReference, email: "wrong@example.com" });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/orders/download — digital fulfilment gating", () => {
  beforeEach(() => {
    createSignedUrlMock.mockReset();
    createSignedUrlMock.mockResolvedValue({ data: { signedUrl: "https://signed.example.com/token" }, error: null });
  });
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  async function createOrderWithDigitalItem(paymentStatus: "pending" | "paid", digitalDownloadPath: string | null = "secret/path.pdf") {
    const [product] = await db.insert(productsTable).values(baseProduct({ price: 10, type: "digital", digitalDownloadPath })).returning();
    const [order] = await db
      .insert(ordersTable)
      .values({
        orderReference: generateOrderReference(),
        customerName: "Test Customer",
        customerEmail: TEST_EMAIL,
        customerPhone: "233241234567",
        country: "Ghana",
        currency: "EUR",
        subtotal: 10,
        shippingTotal: 0,
        discountTotal: 0,
        grandTotal: 10,
        paymentMethod: "paypal",
        paymentStatus,
      })
      .returning();
    await db.insert(orderItemsTable).values({
      orderId: order.id,
      productId: product.id,
      productName: product.title,
      productType: "digital",
      quantity: 1,
      unitPrice: 10,
      lineTotal: 10,
      isDigital: true,
    });
    return { order, product };
  }

  it("refuses a download for an order that isn't paid yet", async () => {
    const { order, product } = await createOrderWithDigitalItem("pending");
    const res = await request(app)
      .get("/api/orders/download")
      .query({ orderReference: order.orderReference, productId: product.id, email: TEST_EMAIL });
    expect(res.status).toBe(403);
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it("mints a signed URL for a paid digital item and never returns the raw storage path", async () => {
    const { order, product } = await createOrderWithDigitalItem("paid", "private/secret-file.pdf");
    const res = await request(app)
      .get("/api/orders/download")
      .query({ orderReference: order.orderReference, productId: product.id, email: TEST_EMAIL });
    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toBe("https://signed.example.com/token");
    expect(JSON.stringify(res.body)).not.toContain("private/secret-file.pdf");
    expect(createSignedUrlMock).toHaveBeenCalledWith("private/secret-file.pdf", expect.any(Number));
  });

  it("rejects a wrong email even for a paid order", async () => {
    const { order, product } = await createOrderWithDigitalItem("paid");
    const res = await request(app)
      .get("/api/orders/download")
      .query({ orderReference: order.orderReference, productId: product.id, email: "wrong@example.com" });
    expect(res.status).toBe(404);
  });
});
