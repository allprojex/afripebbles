import { pgTable, serial, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const curatedPicksTable = pgTable("curated_picks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  affiliateUrl: text("affiliate_url").notNull(),
  brand: text("brand").notNull(),
  isAffiliate: boolean("is_affiliate").notNull().default(true),
  isPersonallyTested: boolean("is_personally_tested").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
});

export const insertCuratedPickSchema = createInsertSchema(curatedPicksTable).omit({ id: true });
export type InsertCuratedPick = z.infer<typeof insertCuratedPickSchema>;
export type CuratedPick = typeof curatedPicksTable.$inferSelect;
