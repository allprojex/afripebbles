import { pgTable, serial, integer, text, real, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { productsTable } from "./products";

export interface OrderItemVariant {
  label: string;
  option: string;
}

/** One resolved option-group selection, snapshotted at order time. */
export interface OrderItemSelection {
  groupLabel: string;
  valueLabel: string;
  priceAdjustment: number;
  sku: string | null;
}

/**
 * Immutable purchase-time snapshot. product_id is kept for traceability but
 * every field an admin/customer needs to see is duplicated here so a later
 * product edit or deletion never changes what a historical order shows.
 *
 * `variant` is the legacy single-option-group snapshot (still populated for
 * products with no option groups/varieties provisioned); `varietyId`/
 * `varietyName`/`varietyDescription`/`sku`/`selections` are the new
 * multi-selection snapshot, populated when the product uses the new model.
 * Order items never live-join back to product_varieties/product_option_*
 * for display — they always render from these denormalized columns.
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
  // No FK — must survive the referenced variety being edited/deleted; this is a snapshot, not a live reference.
  varietyId: integer("variety_id"),
  varietyName: text("variety_name"),
  varietyDescription: text("variety_description"),
  sku: text("sku"),
  selections: jsonb("selections").$type<OrderItemSelection[] | null>(),
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
