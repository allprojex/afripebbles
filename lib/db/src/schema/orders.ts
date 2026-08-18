import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Guest orders — no customer accounts. Looked up publicly by
 * order_reference + email together (see orders.ts route), never by id
 * alone, so sequential ids never need to be hidden from the customer.
 * payment_status and order_status are deliberately independent: a paid
 * order can be pending_payment→paid before fulfilment (order_status)
 * moves at all.
 */
export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderReference: text("order_reference").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  country: text("country").notNull(),
  deliveryAddress: text("delivery_address"), // null when the order is digital-only
  notes: text("notes"),
  currency: text("currency").notNull(),
  subtotal: real("subtotal").notNull(),
  shippingTotal: real("shipping_total").notNull(),
  discountTotal: real("discount_total").notNull().default(0),
  grandTotal: real("grand_total").notNull(),
  paymentMethod: text("payment_method").notNull(), // see PAYMENT_METHOD
  paymentStatus: text("payment_status").notNull().default("pending"), // see PAYMENT_STATUS
  orderStatus: text("order_status").notNull().default("pending_payment"), // see ORDER_STATUS
  paymentNote: text("payment_note"), // admin-recorded reference/note when confirming payment
  paidAt: timestamp("paid_at", { withTimezone: true }),
  trackingNumber: text("tracking_number"),
  internalNotes: text("internal_notes"), // admin-only, never returned from a public route
  couponCode: text("coupon_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
