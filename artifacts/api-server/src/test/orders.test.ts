import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { eq, like, and } from "drizzle-orm";
import request from "supertest";
import { db, productsTable, ordersTable, orderItemsTable, couponsTable } from "@workspace/db";
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
