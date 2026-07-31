import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Grants admin access to a Supabase Auth user. `userId` is that user's
 * `auth.users.id` — there is deliberately no foreign key across the
 * Supabase-managed `auth` schema and ours, so this table can be maintained
 * with plain Drizzle tooling (see scripts/src/make-admin.ts).
 */
export const adminUsersTable = pgTable("admin_users", {
  userId: uuid("user_id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsersTable).omit({ createdAt: true });
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsersTable.$inferSelect;
