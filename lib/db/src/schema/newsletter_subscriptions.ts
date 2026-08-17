import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const newsletterSubscriptionsTable = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  /** When consent was last (re)confirmed — refreshed on every resubscribe. */
  consentGivenAt: timestamp("consent_given_at", { withTimezone: true }).notNull().defaultNow(),
  /** null = active/suppression-list-exempt. Set = suppressed; any future email send must filter this out. */
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  /**
   * Unguessable key for one-click unsubscribe links — not the user's email, so a
   * leaked link can't be used to enumerate subscribers. Deliberately not a DB-level
   * UNIQUE constraint: adding one to a table that already has rows requires an
   * interactive drizzle-kit confirmation that can't run in this non-interactive
   * pipeline, and a gen_random_uuid() collision is practically impossible anyway.
   */
  unsubscribeToken: text("unsubscribe_token").notNull().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNewsletterSubscriptionSchema = createInsertSchema(newsletterSubscriptionsTable).omit({
  id: true,
  createdAt: true,
  consentGivenAt: true,
  unsubscribedAt: true,
  unsubscribeToken: true,
});
export type InsertNewsletterSubscription = z.infer<typeof insertNewsletterSubscriptionSchema>;
export type NewsletterSubscription = typeof newsletterSubscriptionsTable.$inferSelect;
