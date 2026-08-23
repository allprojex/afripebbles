import { pgTable, serial, integer, text, real, boolean, timestamp, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productOptionGroupsTable } from "./product_option_groups";

/**
 * One selectable value within an option group — e.g. "Large", "60 × 90 cm".
 * Dimensions are deliberately just another option group/value pair (no
 * separate width/height/length/unit schema in V1).
 */
export const productOptionValuesTable = pgTable(
  "product_option_values",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => productOptionGroupsTable.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    value: text("value").notNull(), // stable machine slug, independent of label edits
    displayOrder: integer("display_order").notNull().default(0),
    priceAdjustment: real("price_adjustment").notNull().default(0),
    sku: text("sku"),
    imageUrl: text("image_url"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.groupId, table.value), index().on(table.groupId)],
);

export const insertProductOptionValueSchema = createInsertSchema(productOptionValuesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProductOptionValue = z.infer<typeof insertProductOptionValueSchema>;
export type ProductOptionValue = typeof productOptionValuesTable.$inferSelect;
