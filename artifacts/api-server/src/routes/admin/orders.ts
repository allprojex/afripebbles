import { Router, type IRouter } from "express";
import { and, eq, or, ilike, gte, lte, desc, count } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, orderStatusHistoryTable } from "@workspace/db";
import {
  AdminListOrdersQueryParams,
  AdminListOrdersResponse,
  AdminGetOrderParams,
  AdminGetOrderResponse,
  AdminUpdateOrderParams,
  AdminUpdateOrderBody,
  AdminUpdateOrderResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const DEFAULT_LIMIT = 50;

router.get("/orders", async (req, res): Promise<void> => {
  const query = AdminListOrdersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.paymentStatus) conditions.push(eq(ordersTable.paymentStatus, query.data.paymentStatus));
  if (query.data.orderStatus) conditions.push(eq(ordersTable.orderStatus, query.data.orderStatus));
  if (query.data.country) conditions.push(ilike(ordersTable.country, `%${query.data.country}%`));
  if (query.data.dateFrom) conditions.push(gte(ordersTable.createdAt, new Date(query.data.dateFrom)));
  if (query.data.dateTo) conditions.push(lte(ordersTable.createdAt, new Date(query.data.dateTo)));
  if (query.data.search) {
    const s = `%${query.data.search}%`;
    conditions.push(or(ilike(ordersTable.orderReference, s), ilike(ordersTable.customerEmail, s), ilike(ordersTable.customerName, s)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const limit = query.data.limit ?? DEFAULT_LIMIT;
  const offset = query.data.offset ?? 0;

  const [orders, [{ total }]] = await Promise.all([
    db.select().from(ordersTable).where(where).orderBy(desc(ordersTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(ordersTable).where(where),
  ]);

  res.json(AdminListOrdersResponse.parse({ orders, total }));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = AdminGetOrderParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const [items, history] = await Promise.all([
    db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id)),
    db.select().from(orderStatusHistoryTable).where(eq(orderStatusHistoryTable.orderId, order.id)).orderBy(desc(orderStatusHistoryTable.createdAt)),
  ]);

  res.json(AdminGetOrderResponse.parse({ order: { ...order, items }, history }));
});

router.patch("/orders/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateOrderParams.safeParse({ id: parseFloat(req.params.id) });
  const body = AdminUpdateOrderBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error!.message });
    return;
  }

  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const changedBy = req.admin?.email ?? "unknown-admin";
  const updates: Partial<typeof ordersTable.$inferInsert> = { updatedAt: new Date() };
  const historyEntries: (typeof orderStatusHistoryTable.$inferInsert)[] = [];

  if (body.data.paymentStatus && body.data.paymentStatus !== existing.paymentStatus) {
    updates.paymentStatus = body.data.paymentStatus;
    if (body.data.paymentStatus === "paid" && !existing.paidAt) updates.paidAt = new Date();
    historyEntries.push({
      orderId: existing.id,
      changedBy,
      field: "payment_status",
      oldValue: existing.paymentStatus,
      newValue: body.data.paymentStatus,
      note: body.data.statusChangeNote ?? null,
    });
  }
  if (body.data.orderStatus && body.data.orderStatus !== existing.orderStatus) {
    updates.orderStatus = body.data.orderStatus;
    historyEntries.push({
      orderId: existing.id,
      changedBy,
      field: "order_status",
      oldValue: existing.orderStatus,
      newValue: body.data.orderStatus,
      note: body.data.statusChangeNote ?? null,
    });
  }
  if (body.data.trackingNumber !== undefined) updates.trackingNumber = body.data.trackingNumber;
  if (body.data.internalNotes !== undefined) updates.internalNotes = body.data.internalNotes;
  if (body.data.paymentNote !== undefined) updates.paymentNote = body.data.paymentNote;

  const [order] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, params.data.id)).returning();

  if (historyEntries.length > 0) {
    await db.insert(orderStatusHistoryTable).values(historyEntries);
  }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  res.json(AdminUpdateOrderResponse.parse({ ...order, items }));
});

export default router;
