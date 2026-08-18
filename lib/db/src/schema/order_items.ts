import { pgTable, serial, integer, text, real, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { productsTable } from "./products";

export interface OrderItemVariant {
  label: string;
  option: string;
}

/**
 * Immutable purchase-time snapshot. product_id is kept for traceability but
 * every field an admin/customer needs to see is duplicated here so a later
 * product edit or deletion never changes what a historical order shows.
 */
export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  productType: text("product_type").notNull(), // 'digital' | 'physical', snapshot of products.type
  variant: jsonb("variant").$type<OrderItemVariant | null>(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  lineTotal: real("line_total").notNull(),
  shippingAmount: real("shipping_amount").notNull().default(0),
  isDigital: boolean("is_digital").notNull().default(false),
  isPreorder: boolean("is_preorder").notNull().default(false),
  preorderFulfilmentText: text("preorder_fulfilment_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true, createdAt: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItemsTable.$inferSelect;
