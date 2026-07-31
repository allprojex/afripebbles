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

  res.json(AdminUpdateProductResponse.parse(product));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = AdminDeleteProductParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning({ id: productsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.status(204).send();
});

export default router;
