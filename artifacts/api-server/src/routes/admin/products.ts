import { Router, type IRouter } from "express";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  AdminListProductsQueryParams,
  AdminListProductsResponse,
  AdminCreateProductBody,
  AdminCreateProductResponse,
  AdminGetProductParams,
  AdminGetProductResponse,
  AdminUpdateProductParams,
  AdminUpdateProductBody,
  AdminUpdateProductResponse,
  AdminDeleteProductParams,
} from "@workspace/api-zod";
import { isSlugTaken } from "../../lib/slug";
import { collectImageUrls, cleanupOrphanedImages } from "../../lib/imageCleanup";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const query = AdminListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) {
    conditions.push(eq(productsTable.status, query.data.status));
  }
  if (query.data.search) {
    conditions.push(or(ilike(productsTable.title, `%${query.data.search}%`), ilike(productsTable.slug, `%${query.data.search}%`)));
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(productsTable.updatedAt));

  res.json(AdminListProductsResponse.parse(products));
});

router.post("/products", async (req, res): Promise<void> => {
  const body = AdminCreateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (await isSlugTaken(productsTable, productsTable.slug, productsTable.id, body.data.slug)) {
    res.status(409).json({ error: `Slug "${body.data.slug}" is already in use by another product.` });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values(body.data)
    .returning();

  res.status(201).json(AdminCreateProductResponse.parse(product));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = AdminGetProductParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(AdminGetProductResponse.parse(product));
});

router.put("/products/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateProductParams.safeParse({ id: parseFloat(req.params.id) });
  const body = AdminUpdateProductBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error!.message });
    return;
  }

  const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (await isSlugTaken(productsTable, productsTable.slug, productsTable.id, body.data.slug, params.data.id)) {
    res.status(409).json({ error: `Slug "${body.data.slug}" is already in use by another product.` });
    return;
  }

  const [product] = await db
    .update(productsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  // Only images this product no longer references — a failed update never reaches here,
  // so the currently active image set is never touched.
  const newUrls = new Set(collectImageUrls(product.imageUrl, product.previewImageUrl, product.images));
  const removedUrls = collectImageUrls(existing.imageUrl, existing.previewImageUrl, existing.images).filter((url) => !newUrls.has(url));

  if (removedUrls.length > 0) {
    try {
      const cleanup = await cleanupOrphanedImages(removedUrls);
      if (cleanup.failed.length > 0) {
        logger.warn(
          { productId: product.id, failed: cleanup.failed.length },
          "product update: some replaced images could not be removed from storage",
        );
      }
    } catch (err) {
      logger.warn(
        { productId: product.id, err: err instanceof Error ? err.message : String(err) },
        "product update: image cleanup threw",
      );
    }
  }

  res.json(AdminUpdateProductResponse.parse(product));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = AdminDeleteProductParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [deleted] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning({ id: productsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  // The DB row is already gone at this point — storage cleanup is best-effort
  // and must never turn a successful delete into an error response.
  try {
    const cleanup = await cleanupOrphanedImages(collectImageUrls(existing.imageUrl, existing.previewImageUrl, existing.images));
    if (cleanup.failed.length > 0) {
      logger.warn({ productId: deleted.id, failed: cleanup.failed.length }, "product delete: some images could not be removed from storage");
    }
  } catch (err) {
    logger.warn({ productId: deleted.id, err: err instanceof Error ? err.message : String(err) }, "product delete: image cleanup threw");
  }

  res.status(204).send();
});

export default router;
