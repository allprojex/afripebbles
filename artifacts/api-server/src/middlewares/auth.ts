import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, adminUsersTable } from "@workspace/db";
import { getSupabaseAdmin } from "../lib/supabase";

export interface AdminPrincipal {
  id: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminPrincipal;
    }
  }
}

/**
 * Verifies the bearer token against Supabase Auth (never trusting anything
 * the client claims), then confirms the resulting user is a row in
 * admin_users before allowing the request through. Every /api/admin/* router
 * applies this — hiding admin nav links client-side is not the protection.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch {
    res.status(503).json({ error: "Admin authentication is not configured yet" });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  const [adminRow] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.userId, data.user.id));
  if (!adminRow) {
    res.status(403).json({ error: "This account does not have admin access" });
    return;
  }

  req.admin = { id: data.user.id, email: adminRow.email, role: adminRow.role };
  next();
}
