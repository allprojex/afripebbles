/**
 * Grants admin access to an existing Supabase Auth user, without ever
 * hardcoding credentials in source. Usage:
 *
 *   1. Create the user yourself in the Supabase Dashboard
 *      (Authentication → Users → Add user) — there is no public signup route.
 *   2. Copy scripts/.env.example to scripts/.env and fill in SUPABASE_URL,
 *      SUPABASE_SERVICE_ROLE_KEY, and DATABASE_URL.
 *   3. Run: pnpm --filter scripts run make-admin -- you@example.com
 */
import { createClient } from "@supabase/supabase-js";
import { db, adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: pnpm --filter scripts run make-admin -- <email>");
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in scripts/.env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // supabase-js has no getUserByEmail on the admin API — page through listUsers.
  let user: { id: string; email?: string } | undefined;
  for (let page = 1; !user; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error(`Failed to list Supabase users: ${error.message}`);
      process.exit(1);
    }
    user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (data.users.length < 200) break; // last page
  }

  if (!user) {
    console.error(
      `No Supabase Auth user found for "${email}". Create them first in the Supabase Dashboard ` +
        `(Authentication → Users → Add user), then re-run this script.`,
    );
    process.exit(1);
  }

  await db
    .insert(adminUsersTable)
    .values({ userId: user.id, email, role: "admin" })
    .onConflictDoUpdate({ target: adminUsersTable.userId, set: { email, role: "admin" } });

  console.log(`✓ ${email} (${user.id}) now has admin access.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
