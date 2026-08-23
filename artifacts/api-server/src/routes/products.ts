import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  GetProductParams,
  GetProductResponse,
} from "@workspace/api-zod";
import { isPubliclyVisible } from "../lib/visibility";
import { toPublicProduct, toPublicProductChildren } from "../lib/publicProduct";
import { loadProductChildren, EMPTY_PRODUCT_CHILDREN } from "../lib/productComposition";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [isPubliclyVisible(productsTable.status, productsTable.scheduledAt)];
  if (query.data.type) {
    conditions.push(eq(productsTable.type, query.data.type));
  }
  if (query.data.availability) {
    conditions.push(eq(productsTable.availability, query.data.availability));
  }
  if (query.data.featured === "true") {
    conditions.push(eq(productsTable.isFeatured, true));
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(and(...conditions))
    .orderBy(productsTable.createdAt);

  // List cards don't render option/variety/gallery detail today — skip the per-row join here (see GetProduct below for the detail route).
  res.json(ListProductsResponse.parse(products.map((p) => ({ ...toPublicProduct(p), ...EMPTY_PRODUCT_CHILDREN }))));
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
    .where(and(eq(productsTable.id, params.data.id), isPubliclyVisible(productsTable.status, productsTable.scheduledAt)));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const children = toPublicProductChildren(await loadProductChildren(product.id));
  res.json(GetProductResponse.parse({ ...toPublicProduct(product), ...children }));
});

export default router;
