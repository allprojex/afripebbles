import { pgTable, serial, integer, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { productVarietiesTable } from "./product_varieties";

/**
 * General product gallery + per-variety images, one model. A null varietyId
 * means a general gallery image; a set varietyId scopes the image to that
 * variety. onDelete "set null" so deleting a variety drops it back into the
 * general gallery instead of destroying the image.
 */
export const productImagesTable = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    varietyId: integer("variety_id").references(() => productVarietiesTable.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    // Small web-optimized derivative (≤~600px wide) for listing/card contexts — see lib/imagePipeline.ts.
    // Null for images uploaded before the derivative pipeline existed; callers fall back to `url`.
    thumbnailUrl: text("thumbnail_url"),
    altText: text("alt_text"),
    caption: text("caption"),
    displayOrder: integer("display_order").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.productId, table.varietyId)],
);

export const insertProductImageSchema = createInsertSchema(productImagesTable).omit({ id: true, createdAt: true });
export type InsertProductImage = z.infer<typeof insertProductImageSchema>;
export type ProductImage = typeof productImagesTable.$inferSelect;
