import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const curatedPicksTable = pgTable("curated_picks", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  affiliateUrl: text("affiliate_url").notNull(),
  brand: text("brand").notNull(),
  isAffiliate: boolean("is_affiliate").notNull().default(true),
  /** Overrides the site-wide affiliate disclosure text (src/content/site.ts) for this pick when set. */
  affiliateDisclosureText: text("affiliate_disclosure_text"),
  isPersonallyTested: boolean("is_personally_tested").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  status: text("status").notNull().default("draft"), // see CONTENT_STATUS
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCuratedPickSchema = createInsertSchema(curatedPicksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCuratedPick = z.infer<typeof insertCuratedPickSchema>;
export type CuratedPick = typeof curatedPicksTable.$inferSelect;
