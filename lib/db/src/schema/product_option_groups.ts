import { pgTable, serial, integer, text, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

/**
 * A selectable option group on a product — e.g. "Size", "Color", "Dimensions",
 * "Material". Applies to the whole product regardless of which variety (if
 * any) is selected — V1 does not scope groups to specific varieties.
 */
export const productOptionGroupsTable = pgTable(
  "product_option_groups",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // stable machine slug, independent of label edits
    label: text("label").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    required: boolean("required").notNull().default(true),
    helpText: text("help_text"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.productId, table.key), index().on(table.productId)],
);

export const insertProductOptionGroupSchema = createInsertSchema(productOptionGroupsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProductOptionGroup = z.infer<typeof insertProductOptionGroupSchema>;
export type ProductOptionGroup = typeof productOptionGroupsTable.$inferSelect;
