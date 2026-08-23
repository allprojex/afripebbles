import { Router, type IRouter } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { imageSize } from "image-size";
import { getSupabaseAdmin } from "../../lib/supabase";
import { processUploadedImage } from "../../lib/imagePipeline";
import { logger } from "../../lib/logger";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_DIMENSION,
  MAX_UPLOAD_BYTES,
  isStorageBucket,
  parsePublicStorageUrl,
  DIGITAL_DOWNLOAD_BUCKET,
  ALLOWED_DIGITAL_MIME_TYPES,
  MAX_DIGITAL_UPLOAD_BYTES,
  IMMUTABLE_CACHE_CONTROL,
} from "../../lib/storage";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });
const uploadDigital = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_DIGITAL_UPLOAD_BYTES } });

const DIGITAL_EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/epub+zip": "epub",
  "application/vnd.amazon.ebook": "azw",
};

router.post("/uploads", upload.single("file"), async (req, res): Promise<void> => {
  const bucket = req.body?.bucket;
  if (!isStorageBucket(bucket)) {
    res.status(400).json({ error: "A valid bucket is required" });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "A file is required" });
    return;
  }

  if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    res.status(400).json({ error: `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(", ")}` });
    return;
  }

  try {
    // Cheap header-only check before the full decode+resize below — rejects
    // absurd/corrupt input without ever handing it to sharp.
    const { width, height } = imageSize(file.buffer);
    if (!width || !height) {
      res.status(400).json({ error: "Could not read image dimensions — the file may be corrupt." });
      return;
    }
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      res.status(400).json({ error: `Image is too large (${width}x${height}px). Maximum is ${MAX_IMAGE_DIMENSION}px per side.` });
      return;
    }
  } catch {
    res.status(400).json({ error: "Could not read image dimensions — the file may be corrupt." });
    return;
  }

  let processed;
  try {
    processed = await processUploadedImage(file.buffer);
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "upload: image processing failed");
    res.status(400).json({ error: "Could not process this image — the file may be corrupt or in an unsupported format." });
    return;
  }

  const id = randomUUID();
  const displayPath = `${id}.webp`;
  const thumbnailPath = `${id}-thumb.webp`;
  const supabaseAdmin = getSupabaseAdmin();

  const { error: displayError } = await supabaseAdmin.storage.from(bucket).upload(displayPath, processed.display.buffer, {
    contentType: processed.display.contentType,
    cacheControl: IMMUTABLE_CACHE_CONTROL,
    upsert: false,
  });
  if (displayError) {
    res.status(502).json({ error: `Upload failed: ${displayError.message}` });
    return;
  }

  const { error: thumbnailError } = await supabaseAdmin.storage.from(bucket).upload(thumbnailPath, processed.thumbnail.buffer, {
    contentType: processed.thumbnail.contentType,
    cacheControl: IMMUTABLE_CACHE_CONTROL,
    upsert: false,
  });
  // The display image is the one that matters for correctness — if only the thumbnail derivative
  // fails to upload, don't fail the whole request; callers fall back to the display url when
  // thumbnailUrl is null, which is exactly the same fallback already used for pre-pipeline images.
  if (thumbnailError) {
    logger.warn({ bucket, path: thumbnailPath, error: thumbnailError.message }, "upload: thumbnail derivative failed to upload");
  }

  const displayUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(displayPath).data.publicUrl;
  const thumbnailUrl = thumbnailError ? null : supabaseAdmin.storage.from(bucket).getPublicUrl(thumbnailPath).data.publicUrl;

  res.status(201).json({ url: displayUrl, thumbnailUrl });
});

router.delete("/uploads", async (req, res): Promise<void> => {
  const url = typeof req.query.url === "string" ? req.query.url : null;
  if (!url) {
    res.status(400).json({ error: "A url query parameter is required" });
    return;
  }

  const parsed = parsePublicStorageUrl(url);
  if (!parsed) {
    res.status(400).json({ error: "URL does not point to a known storage object" });
    return;
  }

  // Optional — deletes the paired thumbnail derivative alongside the display image.
  // Not derived by naming convention: callers pass whatever thumbnailUrl they actually
  // have on record, which is correct even for pre-pipeline images that have none.
  const thumbnailUrl = typeof req.query.thumbnailUrl === "string" ? req.query.thumbnailUrl : null;
  const parsedThumbnail = thumbnailUrl ? parsePublicStorageUrl(thumbnailUrl) : null;

  const paths = [parsed.path, ...(parsedThumbnail && parsedThumbnail.bucket === parsed.bucket ? [parsedThumbnail.path] : [])];
  const { error } = await getSupabaseAdmin().storage.from(parsed.bucket).remove(paths);
  if (error) {
    res.status(502).json({ error: `Delete failed: ${error.message}` });
    return;
  }

  res.status(204).send();
});

// Digital product files (private bucket) — deliberately separate from the
// image endpoints above: no image-dimension check applies, a much larger
// size limit, and the response never includes a public URL, only the
// storage path. Products.digitalDownloadPath stores that path; a signed,
// time-limited URL is only ever minted for a verified paid order (see
// lib/digitalDownload.ts and routes/orders.ts).
router.post("/uploads/digital", uploadDigital.single("file"), async (req, res): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "A file is required" });
    return;
  }

  if (!(ALLOWED_DIGITAL_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    res.status(400).json({ error: `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_DIGITAL_MIME_TYPES.join(", ")}` });
    return;
  }

  const extension = DIGITAL_EXTENSION_BY_MIME[file.mimetype] ?? "bin";
  const path = `${randomUUID()}.${extension}`;
  const supabaseAdmin = getSupabaseAdmin();

  const { error: uploadError } = await supabaseAdmin.storage.from(DIGITAL_DOWNLOAD_BUCKET).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (uploadError) {
    res.status(502).json({ error: `Upload failed: ${uploadError.message}` });
    return;
  }

  res.status(201).json({ path });
});

router.delete("/uploads/digital", async (req, res): Promise<void> => {
  const path = typeof req.query.path === "string" ? req.query.path : null;
  if (!path) {
    res.status(400).json({ error: "A path query parameter is required" });
    return;
  }

  const { error } = await getSupabaseAdmin().storage.from(DIGITAL_DOWNLOAD_BUCKET).remove([path]);
  if (error) {
    res.status(502).json({ error: `Delete failed: ${error.message}` });
    return;
  }

  res.status(204).send();
});

export default router;
