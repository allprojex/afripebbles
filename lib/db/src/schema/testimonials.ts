import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  roleCompany: text("role_company"),
  testimonialText: text("testimonial_text").notNull(),
  imageUrl: text("image_url"),
  category: text("category"),
  isFeatured: boolean("is_featured").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  status: text("status").notNull().default("draft"), // see CONTENT_STATUS
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTestimonialSchema = createInsertSchema(testimonialsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonialsTable.$inferSelect;
