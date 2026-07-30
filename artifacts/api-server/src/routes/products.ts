import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  GetProductParams,
  GetProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.type) {
    conditions.push(eq(productsTable.type, query.data.type));
  }
  if (query.data.availability) {
    conditions.push(eq(productsTable.availability, query.data.availability));
  }
  if (query.data.featured === "true") {
    conditions.push(eq(productsTable.isFeatured, true));
  }

  const products =
    conditions.length > 0
      ? await db
          .select()
          .from(productsTable)
          .where(and(...conditions))
          .orderBy(productsTable.createdAt)
      : await db.select().from(productsTable).orderBy(productsTable.createdAt);

  res.json(ListProductsResponse.parse(products));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProductParams.safeParse({ id: parseFloat(raw) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(GetProductResponse.parse(product));
});

export default router;
