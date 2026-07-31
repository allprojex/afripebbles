import { pgTable, serial, text, boolean, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** available: in stock now. preorder: open for ordering ahead of fulfilment. coming_soon: not orderable yet. out_of_stock: was available, currently isn't. */
export const PRODUCT_AVAILABILITY = ["available", "preorder", "coming_soon", "out_of_stock"] as const;

/** in_stock: normal. limited: low quantity, still orderable. out_of_stock: not orderable. */
export const PRODUCT_STOCK_STATUS = ["in_stock", "limited", "out_of_stock"] as const;

export interface ProductVariant {
  label: string;
  options: string[];
}

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("EUR"),
  type: text("type").notNull(), // 'digital' | 'physical'
  category: text("category"),
  imageUrl: text("image_url"),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  previewImageUrl: text("preview_image_url"),
  availability: text("availability").notNull().default("available"), // see PRODUCT_AVAILABILITY
  stockStatus: text("stock_status").notNull().default("in_stock"), // see PRODUCT_STOCK_STATUS
  isFeatured: boolean("is_featured").notNull().default(false),
  downloadUrl: text("download_url"),
  // Pre-order specific fields — only meaningful when availability = 'preorder'.
  preorderOpensAt: timestamp("preorder_opens_at", { withTimezone: true }),
  preorderClosesAt: timestamp("preorder_closes_at", { withTimezone: true }),
  estimatedFulfilment: text("estimated_fulfilment"),
  regions: jsonb("regions").$type<string[]>().notNull().default([]),
  variants: jsonb("variants").$type<ProductVariant[]>().notNull().default([]),
  externalPurchaseUrl: text("external_purchase_url"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("draft"), // see CONTENT_STATUS
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
