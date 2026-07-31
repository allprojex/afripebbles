import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** article: general long-form. guide: how-to. video/vlog: primarily a YouTube embed. reflection: faith reflection. wellness/beauty/financial: topical content pieces. */
export const BLOG_CONTENT_TYPES = [
  "article",
  "guide",
  "video",
  "vlog",
  "reflection",
  "wellness",
  "beauty",
  "financial",
] as const;

export const blogPostsTable = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  contentType: text("content_type").notNull().default("article"), // see BLOG_CONTENT_TYPES
  category: text("category").notNull(),
  coverImageUrl: text("cover_image_url"),
  youtubeUrl: text("youtube_url"),
  authorDisplayName: text("author_display_name"),
  isFeatured: boolean("is_featured").notNull().default(false),
  readTimeMinutes: integer("read_time_minutes").notNull().default(5),
  status: text("status").notNull().default("draft"), // see CONTENT_STATUS
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
});

export const insertBlogPostSchema = createInsertSchema(blogPostsTable).omit({ id: true, updatedAt: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPostsTable.$inferSelect;
