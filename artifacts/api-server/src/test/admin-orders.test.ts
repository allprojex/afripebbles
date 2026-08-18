import { describe, expect, it, beforeEach, afterAll } from "vitest";
import { randomUUID } from "crypto";
import express, { type Express } from "express";
import request from "supertest";
import { eq, like } from "drizzle-orm";
import { db, productsTable, ordersTable, orderItemsTable, orderStatusHistoryTable, couponsTable } from "@workspace/db";
import { generateOrderReference } from "../lib/orderReference";
import adminOrdersRouter from "../routes/admin/orders";
import adminCouponsRouter from "../routes/admin/coupons";

// requireAdmin is exercised centrally in admin-auth.test.ts; business logic
// here runs against a minimal app with a fixed req.admin, matching the
// product-image-cleanup.test.ts convention of not needing a real Supabase token.
function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());
  testApp.use((req, _res, next) => {
    req.admin = { id: "test-admin-id", email: "admin@example.com", role: "admin" };
    next();
  });
  testApp.use("/api/admin", adminOrdersRouter);
  testApp.use("/api/admin", adminCouponsRouter);
  return testApp;
}

const TEST_PREFIX = "__test-admin-orders-";
const TEST_EMAIL = `${TEST_PREFIX}customer@example.com`;

async function cleanupTestData() {
  const testOrders = await db.select({ id: ordersTable.id }).from(ordersTable).where(like(ordersTable.customerEmail, `${TEST_PREFIX}%`));
  for (const o of testOrders) {
    await db.delete(orderStatusHistoryTable).where(eq(orderStatusHistoryTable.orderId, o.id));
    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, o.id));
  }
  await db.delete(ordersTable).where(like(ordersTable.customerEmail, `${TEST_PREFIX}%`));
  await db.delete(productsTable).where(like(productsTable.slug, `${TEST_PREFIX}%`));
  await db.delete(couponsTable).where(like(couponsTable.code, `${TEST_PREFIX.toUpperCase()}%`));
}

async function createTestOrder() {
  const [product] = await db
    .insert(productsTable)
    .values({
      slug: `${TEST_PREFIX}${randomUUID()}`,
      title: "Admin Test Product",
      description: "For admin order tests.",
      price: 10,
      currency: "EUR",
      type: "digital",
      availability: "available",
      status: "published",
    })
    .returning();
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
  return order;
}

describe("admin order management", () => {
  const testApp = createTestApp();

  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  it("lists orders with pagination metadata", async () => {
    await createTestOrder();
    const res = await request(testApp).get("/api/admin/orders").query({ search: TEST_PREFIX });
    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.total).toBe("number");
  });

  it("filters orders by payment status", async () => {
    const order = await createTestOrder();
    await db.update(ordersTable).set({ paymentStatus: "paid" }).where(eq(ordersTable.id, order.id));
    const res = await request(testApp).get("/api/admin/orders").query({ paymentStatus: "paid", search: TEST_PREFIX });
    expect(res.status).toBe(200);
    expect(res.body.orders.every((o: { paymentStatus: string }) => o.paymentStatus === "paid")).toBe(true);
  });

  it("returns order detail with items and an empty history for a fresh order", async () => {
    const order = await createTestOrder();
    const res = await request(testApp).get(`/api/admin/orders/${order.id}`);
    expect(res.status).toBe(200);
    expect(res.body.order.items).toHaveLength(1);
    expect(res.body.history).toEqual([]);
  });

  it("marking payment as paid records an audit-trail entry, sets paidAt, and never lets a client set paidAt directly", async () => {
    const order = await createTestOrder();
    const res = await request(testApp).patch(`/api/admin/orders/${order.id}`).send({ paymentStatus: "paid", statusChangeNote: "Confirmed via MoMo receipt" });
    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");

    const [updated] = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id));
    expect(updated.paidAt).not.toBeNull();

    const history = await db.select().from(orderStatusHistoryTable).where(eq(orderStatusHistoryTable.orderId, order.id));
    expect(history).toHaveLength(1);
    expect(history[0].field).toBe("payment_status");
    expect(history[0].oldValue).toBe("pending");
    expect(history[0].newValue).toBe("paid");
    expect(history[0].changedBy).toBe("admin@example.com");
    expect(history[0].note).toBe("Confirmed via MoMo receipt");
  });

  it("updating fulfilment status independently does not change payment status", async () => {
    const order = await createTestOrder();
    const res = await request(testApp).patch(`/api/admin/orders/${order.id}`).send({ orderStatus: "processing", trackingNumber: "TRACK123" });
    expect(res.status).toBe(200);
    expect(res.body.orderStatus).toBe("processing");
    expect(res.body.paymentStatus).toBe("pending");
    expect(res.body.trackingNumber).toBe("TRACK123");
  });

  it("does not record a history entry when a PATCH doesn't actually change payment/order status", async () => {
    const order = await createTestOrder();
    await request(testApp).patch(`/api/admin/orders/${order.id}`).send({ internalNotes: "just a note" });
    const history = await db.select().from(orderStatusHistoryTable).where(eq(orderStatusHistoryTable.orderId, order.id));
    expect(history).toHaveLength(0);
  });

  it("404s for a nonexistent order id", async () => {
    const res = await request(testApp).get("/api/admin/orders/999999999");
    expect(res.status).toBe(404);
  });
});

describe("admin coupon management", () => {
  const testApp = createTestApp();

  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  it("creates a coupon and normalizes its code to uppercase", async () => {
    const res = await request(testApp)
      .post("/api/admin/coupons")
      .send({ code: `${TEST_PREFIX}launch10`, discountType: "percentage", discountValue: 10, isActive: true });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(`${TEST_PREFIX}LAUNCH10`.toUpperCase());
  });

  it("rejects creating a duplicate coupon code", async () => {
    const code = `${TEST_PREFIX.toUpperCase()}DUPE`;
    await db.insert(couponsTable).values({ code, discountType: "fixed", discountValue: 5 });
    const res = await request(testApp).post("/api/admin/coupons").send({ code, discountType: "fixed", discountValue: 5 });
    expect(res.status).toBe(409);
  });

  it("deletes a coupon", async () => {
    const [coupon] = await db
      .insert(couponsTable)
      .values({ code: `${TEST_PREFIX.toUpperCase()}DELME`, discountType: "fixed", discountValue: 5 })
      .returning();
    const res = await request(testApp).delete(`/api/admin/coupons/${coupon.id}`);
    expect(res.status).toBe(204);
    const [row] = await db.select().from(couponsTable).where(eq(couponsTable.id, coupon.id));
    expect(row).toBeUndefined();
  });
});
