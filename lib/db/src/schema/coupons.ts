import { pgTable, serial, text, real, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** All validation (active window, usage limit, minimum order, restrictions) happens server-side at order creation — never trust a client-side discount calculation. */
export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull(), // see COUPON_DISCOUNT_TYPE
  discountValue: real("discount_value").notNull(),
  currency: text("currency"), // only meaningful for discount_type = 'fixed'
  activeFrom: timestamp("active_from", { withTimezone: true }),
  activeUntil: timestamp("active_until", { withTimezone: true }),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").notNull().default(0),
  minimumOrderAmount: real("minimum_order_amount"),
  isActive: boolean("is_active").notNull().default(true),
  restrictedProductIds: jsonb("restricted_product_ids").$type<number[]>(),
  restrictedCategory: text("restricted_category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCouponSchema = createInsertSchema(couponsTable).omit({ id: true, usageCount: true, createdAt: true, updatedAt: true });
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof couponsTable.$inferSelect;
