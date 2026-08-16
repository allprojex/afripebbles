import {
  db,
  productsTable,
  podcastEpisodesTable,
  blogPostsTable,
  curatedPicksTable,
  homepageContentTable,
  siteSettingsTable,
} from "@workspace/db";
import { parsePublicStorageUrl, removeStorageObjects, type StorageObjectRef } from "./storage";

/** Flattens image fields (single URLs and/or arrays, any of them nullable) into a deduped list. */
export function collectImageUrls(...fields: (string | null | undefined | string[])[]): string[] {
  const urls: string[] = [];
  for (const field of fields) {
    if (Array.isArray(field)) {
      urls.push(...field.filter((url): url is string => Boolean(url)));
    } else if (field) {
      urls.push(field);
    }
  }
  return Array.from(new Set(urls));
}

/**
 * Every image URL currently referenced by any content record, across every
 * table that can point at a Supabase Storage object.
 *
 * Call this *after* the mutation you're cleaning up for (a delete or an
 * update) has committed — the row you just changed is already reflected
 * here, so its own post-mutation state naturally excludes URLs it no longer
 * uses, and a deleted row can no longer "protect" its old images.
 */
export async function getReferencedImageUrls(): Promise<Set<string>> {
  const [products, podcasts, posts, picks, homepage, settings] = await Promise.all([
    db
      .select({ imageUrl: productsTable.imageUrl, previewImageUrl: productsTable.previewImageUrl, images: productsTable.images })
      .from(productsTable),
    db.select({ coverImageUrl: podcastEpisodesTable.coverImageUrl }).from(podcastEpisodesTable),
    db.select({ coverImageUrl: blogPostsTable.coverImageUrl }).from(blogPostsTable),
    db.select({ imageUrl: curatedPicksTable.imageUrl }).from(curatedPicksTable),
    db.select({ heroImageUrl: homepageContentTable.heroImageUrl }).from(homepageContentTable),
    db.select({ socialShareImageUrl: siteSettingsTable.socialShareImageUrl }).from(siteSettingsTable),
  ]);

  const urls = new Set<string>();
  for (const row of products) {
    for (const url of collectImageUrls(row.imageUrl, row.previewImageUrl, row.images)) urls.add(url);
  }
  for (const row of podcasts) if (row.coverImageUrl) urls.add(row.coverImageUrl);
  for (const row of posts) if (row.coverImageUrl) urls.add(row.coverImageUrl);
  for (const row of picks) if (row.imageUrl) urls.add(row.imageUrl);
  for (const row of homepage) if (row.heroImageUrl) urls.add(row.heroImageUrl);
  for (const row of settings) if (row.socialShareImageUrl) urls.add(row.socialShareImageUrl);

  return urls;
}

export interface ImageCleanupResult {
  /** Successfully removed from storage. */
  deleted: string[];
  /** Left alone because another content record still points at it. */
  skippedReferenced: string[];
  /** Left alone because it isn't a URL we own (external, malformed, or a different Supabase project). */
  skippedExternal: string[];
  /** We tried to delete these and the storage call failed — non-fatal, needs admin attention. */
  failed: { url: string; error: string }[];
}

/**
 * Deletes storage objects that are no longer referenced by any content
 * record. Safe to call with URLs that are external, malformed, or already
 * gone — those are reported back in the result, never thrown.
 *
 * Callers must only pass URLs that have *already* stopped being referenced
 * by the row they came from (i.e. call after the DB write that removed
 * them has committed) — this function itself checks every other table
 * before deleting anything.
 */
export async function cleanupOrphanedImages(candidateUrls: (string | null | undefined)[]): Promise<ImageCleanupResult> {
  const result: ImageCleanupResult = { deleted: [], skippedReferenced: [], skippedExternal: [], failed: [] };
  const unique = collectImageUrls(...candidateUrls);
  if (unique.length === 0) return result;

  const referenced = await getReferencedImageUrls();

  const toRemove: { url: string; ref: StorageObjectRef }[] = [];
  for (const url of unique) {
    if (referenced.has(url)) {
      result.skippedReferenced.push(url);
      continue;
    }
    const parsed = parsePublicStorageUrl(url);
    if (!parsed) {
      result.skippedExternal.push(url);
      continue;
    }
    toRemove.push({ url, ref: parsed });
  }

  if (toRemove.length === 0) return result;

  const removalResults = await removeStorageObjects(toRemove.map((item) => item.ref));

  for (const item of toRemove) {
    const outcome = removalResults.find((r) => r.bucket === item.ref.bucket && r.path === item.ref.path);
    if (outcome?.error) {
      result.failed.push({ url: item.url, error: outcome.error });
    } else {
      result.deleted.push(item.url);
    }
  }

  return result;
}
