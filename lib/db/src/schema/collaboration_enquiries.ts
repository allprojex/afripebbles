import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const collaborationEnquiriesTable = pgTable("collaboration_enquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  campaignType: text("campaign_type"),
  budgetRange: text("budget_range"),
  timeline: text("timeline"),
  links: text("links"),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"), // see ENQUIRY_STATUS
  internalNotes: text("internal_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCollaborationEnquirySchema = createInsertSchema(collaborationEnquiriesTable).omit({
  id: true,
  createdAt: true,
  status: true,
  internalNotes: true,
});
export type InsertCollaborationEnquiry = z.infer<typeof insertCollaborationEnquirySchema>;
export type CollaborationEnquiry = typeof collaborationEnquiriesTable.$inferSelect;
