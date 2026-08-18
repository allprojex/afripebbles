import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, couponsTable, productsTable } from "@workspace/db";
import {
  QuoteOrderBody,
  QuoteOrderResponse,
  CreateOrderBody,
  CreateOrderResponse,
  TrackOrderBody,
  TrackOrderResponse,
  GetOrderItemDownloadUrlQueryParams,
  GetOrderItemDownloadUrlResponse,
} from "@workspace/api-zod";
import { calculateOrderTotals, OrderValidationError, type CartItemInput } from "../lib/pricing";
import { generateOrderReference } from "../lib/orderReference";
import { createDigitalDownloadUrl } from "../lib/digitalDownload";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/orders/quote", async (req, res): Promise<void> => {
  const body = QuoteOrderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    const result = await calculateOrderTotals(body.data.items as CartItemInput[], body.data.couponCode);
    res.json(
      QuoteOrderResponse.parse({
        currency: result.currency,
        subtotal: result.subtotal,
        shippingTotal: result.shippingTotal,
        discountTotal: result.discountTotal,
        grandTotal: result.grandTotal,
        items: result.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
          shippingAmount: i.shippingAmount,
          isDigital: i.isDigital,
          isPreorder: i.isPreorder,
        })),
      }),
    );
  } catch (err) {
    if (err instanceof OrderValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

router.post("/orders", async (req, res): Promise<void> => {
  const body = CreateOrderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.consent !== true) {
    res.status(400).json({ error: "You must accept the terms to place an order." });
    return;
  }

  let pricing;
  try {
    pricing = await calculateOrderTotals(body.data.items as CartItemInput[], body.data.couponCode);
  } catch (err) {
    if (err instanceof OrderValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }

  const requiresDeliveryAddress = pricing.items.some((i) => !i.isDigital);
  if (requiresDeliveryAddress && !body.data.deliveryAddress) {
    res.status(400).json({ error: "A delivery address is required for physical items." });
    return;
  }

  let created;
  try {
    created = await db.transaction(async (tx) => {
      let orderReference = generateOrderReference();
      let attempt = 0;
      // Collision is astronomically unlikely (6 chars over a 31-symbol alphabet,
      // per calendar day) — a short bounded retry is just defensive.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const [existing] = await tx.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.orderReference, orderReference));
        if (!existing) break;
        attempt += 1;
        if (attempt > 5) throw new Error("Could not generate a unique order reference.");
        orderReference = generateOrderReference();
      }

      const [order] = await tx
        .insert(ordersTable)
        .values({
          orderReference,
          customerName: body.data.customerName,
          customerEmail: body.data.customerEmail,
          customerPhone: body.data.customerPhone,
          country: body.data.country,
          deliveryAddress: body.data.deliveryAddress ?? null,
          notes: body.data.notes ?? null,
          currency: pricing.currency,
          subtotal: pricing.subtotal,
          shippingTotal: pricing.shippingTotal,
          discountTotal: pricing.discountTotal,
          grandTotal: pricing.grandTotal,
          paymentMethod: body.data.paymentMethod,
          couponCode: pricing.coupon?.code ?? null,
        })
        .returning();

      const items = await tx
        .insert(orderItemsTable)
        .values(
          pricing.items.map((i) => ({
            orderId: order.id,
            productId: i.productId,
            productName: i.productName,
            productType: i.productType,
            variant: i.variant,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
            shippingAmount: i.shippingAmount,
            isDigital: i.isDigital,
            isPreorder: i.isPreorder,
            preorderFulfilmentText: i.preorderFulfilmentText,
          })),
        )
        .returning();

      if (pricing.coupon) {
        await tx
          .update(couponsTable)
          .set({ usageCount: pricing.coupon.usageCount + 1, updatedAt: new Date() })
          .where(eq(couponsTable.id, pricing.coupon.id));
      }

      return { ...order, items };
    });
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "order creation transaction failed");
    res.status(500).json({ error: "Could not create the order. Please try again." });
    return;
  }

  res.status(201).json(CreateOrderResponse.parse(created));
});

router.post("/orders/track", async (req, res): Promise<void> => {
  const body = TrackOrderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.orderReference, body.data.orderReference.trim()), eq(ordersTable.customerEmail, body.data.email.trim().toLowerCase())));

  if (!order) {
    res.status(404).json({ error: "No order found for that reference and email." });
    return;
  }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));

  res.json(
    TrackOrderResponse.parse({
      orderReference: order.orderReference,
      createdAt: order.createdAt,
      currency: order.currency,
      grandTotal: order.grandTotal,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      trackingNumber: order.trackingNumber,
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        variant: i.variant,
        quantity: i.quantity,
        lineTotal: i.lineTotal,
        isDigital: i.isDigital,
        isPreorder: i.isPreorder,
      })),
    }),
  );
});

router.get("/orders/download", async (req, res): Promise<void> => {
  const query = GetOrderItemDownloadUrlQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.orderReference, query.data.orderReference.trim()), eq(ordersTable.customerEmail, query.data.email.trim().toLowerCase())));

  if (!order) {
    res.status(404).json({ error: "No order found for that reference and email." });
    return;
  }

  if (order.paymentStatus !== "paid") {
    res.status(403).json({ error: "This order hasn't been marked as paid yet." });
    return;
  }

  const [item] = await db
    .select()
    .from(orderItemsTable)
    .where(and(eq(orderItemsTable.orderId, order.id), eq(orderItemsTable.productId, query.data.productId), eq(orderItemsTable.isDigital, true)));

  if (!item || !item.productId) {
    res.status(403).json({ error: "This isn't a digital item on this order." });
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
  if (!product?.digitalDownloadPath) {
    res.status(404).json({ error: "No digital file is available for this item." });
    return;
  }

  try {
    const downloadUrl = await createDigitalDownloadUrl(product.digitalDownloadPath);
    res.json(GetOrderItemDownloadUrlResponse.parse({ downloadUrl }));
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "failed to mint digital download URL");
    res.status(502).json({ error: "Could not generate a download link. Please try again shortly." });
  }
});

export default router;
