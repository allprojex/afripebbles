import { pgTable, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Singleton row (id is always 1) letting the admin override homepage copy
 * without touching source. Every field is nullable — the homepage falls back
 * to the existing verified copy from src/content/site.ts when unset, so
 * there is never a blank/broken hero.
 */
export const homepageContentTable = pgTable("homepage_content", {
  id: integer("id").primaryKey().default(1),
  heroHeading: text("hero_heading"),
  heroSubheading: text("hero_subheading"),
  heroImageUrl: text("hero_image_url"),
  primaryCtaLabel: text("primary_cta_label"),
  primaryCtaHref: text("primary_cta_href"),
  secondaryCtaLabel: text("secondary_cta_label"),
  secondaryCtaHref: text("secondary_cta_href"),
  showPodcastSection: boolean("show_podcast_section").notNull().default(true),
  showShopSection: boolean("show_shop_section").notNull().default(true),
  showJournalSection: boolean("show_journal_section").notNull().default(true),
  showRecommendationsSection: boolean("show_recommendations_section").notNull().default(true),
  showCollaborateSection: boolean("show_collaborate_section").notNull().default(true),
  showTestimonialsSection: boolean("show_testimonials_section").notNull().default(true),
  showNewsletterSection: boolean("show_newsletter_section").notNull().default(true),
  newsletterHeading: text("newsletter_heading"),
  newsletterBody: text("newsletter_body"),
  collaborateHeading: text("collaborate_heading"),
  collaborateBody: text("collaborate_body"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHomepageContentSchema = createInsertSchema(homepageContentTable).omit({ updatedAt: true });
export type InsertHomepageContent = z.infer<typeof insertHomepageContentSchema>;
export type HomepageContent = typeof homepageContentTable.$inferSelect;
