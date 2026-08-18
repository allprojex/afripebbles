import { pgTable, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import type { MobileMoneyDetails, BankTransferDetails } from "./shared";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Singleton row (id is always 1). Every field is nullable — public pages must
 * merge this with the verified defaults in src/content/site.ts, never publish
 * a value that hasn't been explicitly confirmed here or in that file.
 */
export const siteSettingsTable = pgTable("site_settings", {
  id: integer("id").primaryKey().default(1),
  brandName: text("brand_name"),
  tagline: text("tagline"),
  contactEmail: text("contact_email"),
  supportEmail: text("support_email"),
  collaborationEmail: text("collaboration_email"),
  whatsappNumber: text("whatsapp_number"),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  youtubeUrl: text("youtube_url"),
  tiktokUrl: text("tiktok_url"),
  seoDefaultTitle: text("seo_default_title"),
  seoDefaultDescription: text("seo_default_description"),
  canonicalUrl: text("canonical_url"),
  socialShareImageUrl: text("social_share_image_url"),
  businessCountry: text("business_country"),
  supportedRegions: jsonb("supported_regions").$type<string[]>().notNull().default([]),
  defaultCurrency: text("default_currency"),
  newsletterWording: text("newsletter_wording"),
  footerText: text("footer_text"),
  podcastLaunchStatus: text("podcast_launch_status"), // 'pre_launch' | 'launched'
  shopStatus: text("shop_status"), // free text notice, e.g. 'Shop is open' / 'Pre-orders only'
  preorderNotice: text("preorder_notice"),
  shippingNotice: text("shipping_notice"),
  affiliateDisclosure: text("affiliate_disclosure"),
  privacyContactInfo: text("privacy_contact_info"),
  // Commerce settings (V1: manual/external payment methods only, no embedded gateway).
  // Deliberately separate from the general-contact `whatsappNumber` above — this one
  // is only ever used for the checkout "Send Order to WhatsApp" flow.
  commerceWhatsappNumber: text("commerce_whatsapp_number"), // digits only, international code, no leading '+'
  paypalPaymentLink: text("paypal_payment_link"),
  mobileMoneyDetails: jsonb("mobile_money_details").$type<MobileMoneyDetails | null>(),
  bankTransferDetails: jsonb("bank_transfer_details").$type<BankTransferDetails | null>(),
  supportedCurrencies: jsonb("supported_currencies").$type<string[]>().notNull().default(["GHS", "EUR"]),
  orderContactEmail: text("order_contact_email"),
  checkoutInstructions: text("checkout_instructions"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettingsTable).omit({ updatedAt: true });
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
export type SiteSettings = typeof siteSettingsTable.$inferSelect;
