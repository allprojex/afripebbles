import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { randomUUID } from "crypto";
import express, { type Express } from "express";
import request from "supertest";
import { eq, like } from "drizzle-orm";
import { db, productsTable, productOptionGroupsTable, productOptionValuesTable, productVarietiesTable, productImagesTable } from "@workspace/db";
import productsRouter from "../routes/admin/products";

// Supabase Storage is mocked (consistent with product-image-cleanup.test.ts) — everything else
// runs against the real connected DB, including the new option-group/variety/image tables.
const { removeMock } = vi.hoisted(() => ({ removeMock: vi.fn() }));

vi.mock("../lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    storage: {
      from: () => ({ remove: removeMock }),
    },
  }),
}));

function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());
  testApp.use("/api/admin", productsRouter);
  return testApp;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
function fakeImageUrl(bucket: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${randomUUID()}.jpg`;
}
function pathOf(url: string) {
  return url.split("/").pop()!;
}

const TEST_PREFIX = "__test-product-options-";
async function cleanupBySlugPrefix() {
  await db.delete(productsTable).where(like(productsTable.slug, `${TEST_PREFIX}%`));
}

function baseProductBody(overrides: Record<string, unknown> = {}) {
  return {
    slug: `${TEST_PREFIX}${randomUUID()}`,
    title: "Options Test Product",
    description: "Used to verify the multi-option-group/variety admin write path.",
    price: 20,
    type: "physical",
    status: "draft",
    ...overrides,
  };
}

describe("admin product option groups / varieties / gallery (live DB, mocked storage)", () => {
  const testApp = createTestApp();

  beforeEach(() => {
    removeMock.mockReset();
    removeMock.mockResolvedValue({ data: [{ name: "removed" }], error: null });
  });

  afterAll(cleanupBySlugPrefix);

  it("creates a product with option groups, a variety, and gallery images in one save", async () => {
    try {
      const res = await request(testApp)
        .post("/api/admin/products")
        .send(
          baseProductBody({
            optionGroups: [
              {
                key: "size",
                label: "Size",
                required: true,
                values: [
                  { label: "Small", value: "s", priceAdjustment: 0 },
                  { label: "Large", value: "l", priceAdjustment: 5 },
                ],
              },
            ],
            varieties: [
              {
                name: "Burgundy set",
                description: "Deep red velvet finish.",
                priceOverride: 25,
                images: [{ url: fakeImageUrl("product-images"), altText: "Burgundy baubles" }],
              },
            ],
            gallery: [{ url: fakeImageUrl("product-images"), altText: "General shot" }],
          }),
        );

      expect(res.status).toBe(201);
      expect(res.body.optionGroups).toHaveLength(1);
      expect(res.body.optionGroups[0].label).toBe("Size");
      expect(res.body.optionGroups[0].values).toHaveLength(2);
      expect(res.body.optionGroups[0].values.map((v: { label: string }) => v.label)).toEqual(["Small", "Large"]);
      expect(res.body.varieties).toHaveLength(1);
      expect(res.body.varieties[0].name).toBe("Burgundy set");
      expect(res.body.varieties[0].priceOverride).toBe(25);
      expect(res.body.varieties[0].images).toHaveLength(1);
      expect(res.body.gallery).toHaveLength(1);

      const groups = await db.select().from(productOptionGroupsTable).where(eq(productOptionGroupsTable.productId, res.body.id));
      expect(groups).toHaveLength(1);
      const varieties = await db.select().from(productVarietiesTable).where(eq(productVarietiesTable.productId, res.body.id));
      expect(varieties).toHaveLength(1);
      const images = await db.select().from(productImagesTable).where(eq(productImagesTable.productId, res.body.id));
      expect(images).toHaveLength(2); // one variety image + one gallery image
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("GET by id returns the full nested shape; GET list returns empty children arrays (no per-row join)", async () => {
    try {
      const created = await request(testApp)
        .post("/api/admin/products")
        .send(baseProductBody({ optionGroups: [{ key: "size", label: "Size", values: [{ label: "M", value: "m" }] }] }));
      expect(created.status).toBe(201);

      const detail = await request(testApp).get(`/api/admin/products/${created.body.id}`);
      expect(detail.status).toBe(200);
      expect(detail.body.optionGroups).toHaveLength(1);

      const list = await request(testApp).get("/api/admin/products").query({ search: TEST_PREFIX });
      expect(list.status).toBe(200);
      const row = list.body.find((p: { id: number }) => p.id === created.body.id);
      expect(row).toBeDefined();
      expect(row.optionGroups).toEqual([]);
      expect(row.varieties).toEqual([]);
      expect(row.gallery).toEqual([]);
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("a save wholesale replaces option groups/varieties — old rows are gone, new ones take their place", async () => {
    try {
      const created = await request(testApp)
        .post("/api/admin/products")
        .send(baseProductBody({ optionGroups: [{ key: "size", label: "Size", values: [{ label: "M", value: "m" }] }] }));
      const firstGroupId = created.body.optionGroups[0].id;

      const updated = await request(testApp)
        .put(`/api/admin/products/${created.body.id}`)
        .send(baseProductBody({ slug: created.body.slug, optionGroups: [{ key: "color", label: "Color", values: [{ label: "Black", value: "black" }] }] }));

      expect(updated.status).toBe(200);
      expect(updated.body.optionGroups).toHaveLength(1);
      expect(updated.body.optionGroups[0].label).toBe("Color");
      expect(updated.body.optionGroups[0].id).not.toBe(firstGroupId);

      const [oldGroup] = await db.select().from(productOptionGroupsTable).where(eq(productOptionGroupsTable.id, firstGroupId));
      expect(oldGroup).toBeUndefined();
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("saving with no option groups on a product that had them clears them out", async () => {
    try {
      const created = await request(testApp)
        .post("/api/admin/products")
        .send(baseProductBody({ optionGroups: [{ key: "size", label: "Size", values: [{ label: "M", value: "m" }] }] }));

      const updated = await request(testApp).put(`/api/admin/products/${created.body.id}`).send(baseProductBody({ slug: created.body.slug }));
      expect(updated.status).toBe(200);
      expect(updated.body.optionGroups).toEqual([]);

      const groups = await db.select().from(productOptionGroupsTable).where(eq(productOptionGroupsTable.productId, created.body.id));
      expect(groups).toHaveLength(0);
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("deleting a product removes its variety/gallery/option-value images from storage when unshared", async () => {
    const varietyImageUrl = fakeImageUrl("product-images");
    const optionValueImageUrl = fakeImageUrl("product-images");
    try {
      const created = await request(testApp)
        .post("/api/admin/products")
        .send(
          baseProductBody({
            optionGroups: [{ key: "size", label: "Size", values: [{ label: "L", value: "l", imageUrl: optionValueImageUrl }] }],
            varieties: [{ name: "Burgundy", images: [{ url: varietyImageUrl }] }],
          }),
        );

      const res = await request(testApp).delete(`/api/admin/products/${created.body.id}`);
      expect(res.status).toBe(204);
      expect(removeMock).toHaveBeenCalledTimes(1);
      expect(removeMock).toHaveBeenCalledWith(expect.arrayContaining([pathOf(varietyImageUrl), pathOf(optionValueImageUrl)]));
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("does not remove a variety image still referenced by another product", async () => {
    const sharedImageUrl = fakeImageUrl("product-images");
    try {
      const productA = await request(testApp)
        .post("/api/admin/products")
        .send(baseProductBody({ varieties: [{ name: "Shared variety A", images: [{ url: sharedImageUrl }] }] }));
      await request(testApp).post("/api/admin/products").send(baseProductBody({ gallery: [{ url: sharedImageUrl }] }));

      const res = await request(testApp).delete(`/api/admin/products/${productA.body.id}`);
      expect(res.status).toBe(204);
      expect(removeMock).not.toHaveBeenCalled();
    } finally {
      await cleanupBySlugPrefix();
    }
  });
});
