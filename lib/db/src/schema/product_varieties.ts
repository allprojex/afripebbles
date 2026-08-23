import { pgTable, serial, integer, text, real, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

/**
 * A pictured, named sub-choice on a product — e.g. "Burgundy set", each with
 * its own image(s)/description. Optional: most products have none. Option
 * groups (Size, Color, ...) apply regardless of which variety is selected —
 * V1 does not scope groups to specific varieties.
 */
export const productVarietiesTable = pgTable(
  "product_varieties",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sku: text("sku"),
    // Explicit override, not an adjustment — replaces product.price entirely when set.
    priceOverride: real("price_override"),
    shippingAmountOverride: real("shipping_amount_override"),
    // One of PRODUCT_AVAILABILITY; falls back to product.availability when null.
    availabilityOverride: text("availability_override"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.productId)],
);

export const insertProductVarietySchema = createInsertSchema(productVarietiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProductVariety = z.infer<typeof insertProductVarietySchema>;
export type ProductVariety = typeof productVarietiesTable.$inferSelect;
