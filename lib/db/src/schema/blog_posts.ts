import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const blogPostsTable = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  coverImageUrl: text("cover_image_url"),
  isFeatured: boolean("is_featured").notNull().default(false),
  readTimeMinutes: integer("read_time_minutes").notNull().default(5),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
});

export const insertBlogPostSchema = createInsertSchema(blogPostsTable).omit({ id: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPostsTable.$inferSelect;
