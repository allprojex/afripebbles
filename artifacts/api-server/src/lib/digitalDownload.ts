import { getSupabaseAdmin } from "./supabase";

export const DIGITAL_DOWNLOAD_BUCKET = "digital-downloads";
export const DOWNLOAD_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

/**
 * Mints a fresh, time-limited signed URL from the private digital-downloads
 * bucket. Never returns a permanent public URL, and only ever called after
 * the caller has independently verified the order is paid and this product
 * is a digital line item on it.
 */
export async function createDigitalDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(DIGITAL_DOWNLOAD_BUCKET)
    .createSignedUrl(storagePath, DOWNLOAD_URL_EXPIRY_SECONDS);
  if (error || !data) {
    throw new Error(`Could not create a download link: ${error?.message ?? "unknown error"}`);
  }
  return data.signedUrl;
}
