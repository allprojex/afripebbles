import { Router, type IRouter } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { imageSize } from "image-size";
import { getSupabaseAdmin } from "../../lib/supabase";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_DIMENSION,
  MAX_UPLOAD_BYTES,
  isStorageBucket,
  parsePublicStorageUrl,
} from "../../lib/storage";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
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

  const extension = EXTENSION_BY_MIME[file.mimetype] ?? "bin";
  const path = `${randomUUID()}.${extension}`;
  const supabaseAdmin = getSupabaseAdmin();

  const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (uploadError) {
    res.status(502).json({ error: `Upload failed: ${uploadError.message}` });
    return;
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  res.status(201).json({ url: data.publicUrl });
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

  const { error } = await getSupabaseAdmin().storage.from(parsed.bucket).remove([parsed.path]);
  if (error) {
    res.status(502).json({ error: `Delete failed: ${error.message}` });
    return;
  }

  res.status(204).send();
});

export default router;
