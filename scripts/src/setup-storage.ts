/**
 * Creates the Supabase Storage buckets the admin uploads endpoint expects.
 * Idempotent — safe to re-run. Usage:
 *
 *   pnpm --filter scripts run setup-storage
 *
 * Requires scripts/.env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";

const BUCKETS = ["product-images", "podcast-covers", "article-images", "recommendation-images", "branding"] as const;

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB, must match artifacts/api-server/src/lib/storage.ts

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in scripts/.env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error(`Failed to list buckets: ${listError.message}`);
    process.exit(1);
  }
  const existingNames = new Set((existing ?? []).map((b) => b.name));

  for (const name of BUCKETS) {
    if (existingNames.has(name)) {
      console.log(`- ${name} already exists, skipping`);
      continue;
    }
    const { error } = await supabase.storage.createBucket(name, {
      public: true,
      fileSizeLimit: MAX_UPLOAD_BYTES,
      allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    });
    if (error) {
      console.error(`Failed to create bucket "${name}": ${error.message}`);
      process.exit(1);
    }
    console.log(`✓ created ${name}`);
  }

  console.log("Storage buckets ready.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
