import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** image: a single uploaded photo. video: embedded by YouTube video id (no raw video upload). */
export const UGC_MEDIA_TYPES = ["image", "video"] as const;

export const ugcEntriesTable = pgTable("ugc_entries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  projectCategory: text("project_category"),
  mediaType: text("media_type").notNull().default("image"), // see UGC_MEDIA_TYPES
  imageUrl: text("image_url"),
  youtubeVideoId: text("youtube_video_id"),
  brandName: text("brand_name"),
  externalLink: text("external_link"),
  isFeatured: boolean("is_featured").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  status: text("status").notNull().default("draft"), // see CONTENT_STATUS
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUgcEntrySchema = createInsertSchema(ugcEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUgcEntry = z.infer<typeof insertUgcEntrySchema>;
export type UgcEntry = typeof ugcEntriesTable.$inferSelect;
