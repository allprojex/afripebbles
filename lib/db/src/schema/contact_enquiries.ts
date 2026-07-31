import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const CONTACT_INQUIRY_TYPES = ["general", "collaboration", "order-support", "product"] as const;

export const contactEnquiriesTable = pgTable("contact_enquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  inquiryType: text("inquiry_type").notNull().default("general"), // see CONTACT_INQUIRY_TYPES
  subject: text("subject"),
  message: text("message").notNull(),
  consentGiven: boolean("consent_given").notNull().default(false),
  status: text("status").notNull().default("new"), // see ENQUIRY_STATUS
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContactEnquirySchema = createInsertSchema(contactEnquiriesTable).omit({
  id: true,
  createdAt: true,
  status: true,
  internalNotes: true,
});
export type InsertContactEnquiry = z.infer<typeof insertContactEnquirySchema>;
export type ContactEnquiry = typeof contactEnquiriesTable.$inferSelect;
