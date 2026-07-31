import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Server-only Supabase client, authenticated with the service-role key.
 * Used to verify admin bearer tokens and to write to Storage buckets.
 * Never import this from frontend code.
 *
 * Lazily constructed so that importing this module (and therefore booting
 * the API server, or handling any *public* route) never fails just because
 * Supabase hasn't been configured yet — only calls that actually need it
 * (an admin request with a bearer token, or a storage upload) throw.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (Supabase Project Settings → API) to use admin features.",
    );
  }

  cached = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  return cached;
}
