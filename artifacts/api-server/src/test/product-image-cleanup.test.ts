import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { randomUUID } from "crypto";
import express, { type Express } from "express";
import request from "supertest";
import { eq, like } from "drizzle-orm";
import { db, productsTable, podcastEpisodesTable } from "@workspace/db";
import productsRouter from "../routes/admin/products";
import app from "../app";

// Supabase Storage itself is mocked — we never want these tests to touch a
// real bucket. Everything else (products, podcast episodes, the cross-table
// "is this URL still referenced?" check) runs against the real connected DB,
// consistent with this repo's existing live-DB test convention.
const { removeMock } = vi.hoisted(() => ({ removeMock: vi.fn() }));

vi.mock("../lib/supabase", () => ({
  getSupabaseAdmin: () => ({
    storage: {
      from: () => ({ remove: removeMock }),
    },
  }),
}));

// The requireAdmin gate is exercised separately (admin-auth.test.ts, and the
// spot-check below using the full `app`). Business logic here is tested
// against a minimal app that mounts the products router directly, so these
// tests don't need a real Supabase-issued bearer token.
function createTestApp(): Express {
  const testApp = express();
  testApp.use(express.json());
  testApp.use("/api/admin", productsRouter);
  return testApp;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
function fakeImageUrl(bucket: string, name = `${randomUUID()}.jpg`) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${name}`;
}
function pathOf(url: string) {
  return url.split("/").pop()!;
}

const TEST_PREFIX = "__test-image-cleanup-";
async function cleanupBySlugPrefix() {
  await db.delete(productsTable).where(like(productsTable.slug, `${TEST_PREFIX}%`));
  await db.delete(podcastEpisodesTable).where(like(podcastEpisodesTable.slug, `${TEST_PREFIX}%`));
}

function baseProductBody(overrides: Record<string, unknown> = {}) {
  return {
    slug: `${TEST_PREFIX}${randomUUID()}`,
    title: "Cleanup Test Product",
    description: "Used to verify storage cleanup on delete/update.",
    price: 10,
    type: "digital",
    status: "draft",
    ...overrides,
  };
}

describe("product image storage cleanup (live DB, mocked storage)", () => {
  const testApp = createTestApp();

  beforeEach(() => {
    removeMock.mockReset();
    removeMock.mockResolvedValue({ data: [{ name: "removed" }], error: null });
  });

  afterAll(cleanupBySlugPrefix);

  it("removes an unshared image when its product is deleted", async () => {
    await cleanupBySlugPrefix();
    const imageUrl = fakeImageUrl("product-images");
    const [product] = await db.insert(productsTable).values(baseProductBody({ imageUrl })).returning();

    try {
      const res = await request(testApp).delete(`/api/admin/products/${product.id}`);
      expect(res.status).toBe(204);
      expect(removeMock).toHaveBeenCalledTimes(1);
      expect(removeMock).toHaveBeenCalledWith([pathOf(imageUrl)]);

      const [row] = await db.select().from(productsTable).where(eq(productsTable.id, product.id));
      expect(row).toBeUndefined();
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("does not remove an external (non-Supabase) image when its product is deleted", async () => {
    await cleanupBySlugPrefix();
    const imageUrl = "https://images.example.com/some-external-photo.jpg";
    const [product] = await db.insert(productsTable).values(baseProductBody({ imageUrl })).returning();

    try {
      const res = await request(testApp).delete(`/api/admin/products/${product.id}`);
      expect(res.status).toBe(204);
      expect(removeMock).not.toHaveBeenCalled();
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("does not remove an image still referenced by another product", async () => {
    await cleanupBySlugPrefix();
    const sharedImageUrl = fakeImageUrl("product-images");
    const [productA] = await db.insert(productsTable).values(baseProductBody({ imageUrl: sharedImageUrl })).returning();
    const [productB] = await db.insert(productsTable).values(baseProductBody({ imageUrl: sharedImageUrl })).returning();

    try {
      const res = await request(testApp).delete(`/api/admin/products/${productA.id}`);
      expect(res.status).toBe(204);
      expect(removeMock).not.toHaveBeenCalled();

      const [rowB] = await db.select().from(productsTable).where(eq(productsTable.id, productB.id));
      expect(rowB.imageUrl).toBe(sharedImageUrl);
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("does not remove an image still referenced by a podcast episode's cover", async () => {
    await cleanupBySlugPrefix();
    const sharedImageUrl = fakeImageUrl("product-images");
    const [product] = await db.insert(productsTable).values(baseProductBody({ imageUrl: sharedImageUrl })).returning();
    const [episode] = await db
      .insert(podcastEpisodesTable)
      .values({
        slug: `${TEST_PREFIX}${randomUUID()}`,
        title: "Cleanup Test Episode",
        description: "Shares an image with a test product.",
        episodeNumber: 999,
        coverImageUrl: sharedImageUrl,
        status: "draft",
      })
      .returning();

    try {
      const res = await request(testApp).delete(`/api/admin/products/${product.id}`);
      expect(res.status).toBe(204);
      expect(removeMock).not.toHaveBeenCalled();
    } finally {
      await db.delete(podcastEpisodesTable).where(eq(podcastEpisodesTable.id, episode.id));
      await cleanupBySlugPrefix();
    }
  });

  it("removes the old featured image when it's replaced, and keeps the new one", async () => {
    await cleanupBySlugPrefix();
    const oldUrl = fakeImageUrl("product-images");
    const newUrl = fakeImageUrl("product-images");
    const [product] = await db.insert(productsTable).values(baseProductBody({ imageUrl: oldUrl })).returning();

    try {
      const res = await request(testApp)
        .put(`/api/admin/products/${product.id}`)
        .send(baseProductBody({ slug: product.slug, imageUrl: newUrl }));

      expect(res.status).toBe(200);
      expect(removeMock).toHaveBeenCalledTimes(1);
      expect(removeMock).toHaveBeenCalledWith([pathOf(oldUrl)]);

      const [row] = await db.select().from(productsTable).where(eq(productsTable.id, product.id));
      expect(row.imageUrl).toBe(newUrl);
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("does not delete anything when the featured image is unchanged", async () => {
    await cleanupBySlugPrefix();
    const imageUrl = fakeImageUrl("product-images");
    const [product] = await db.insert(productsTable).values(baseProductBody({ imageUrl })).returning();

    try {
      const res = await request(testApp)
        .put(`/api/admin/products/${product.id}`)
        .send(baseProductBody({ slug: product.slug, title: "Renamed but same image", imageUrl }));

      expect(res.status).toBe(200);
      expect(removeMock).not.toHaveBeenCalled();
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("removing one gallery image preserves the remaining images", async () => {
    await cleanupBySlugPrefix();
    const keepUrl = fakeImageUrl("product-images");
    const removeUrl = fakeImageUrl("product-images");
    const [product] = await db.insert(productsTable).values(baseProductBody({ images: [keepUrl, removeUrl] })).returning();

    try {
      const res = await request(testApp)
        .put(`/api/admin/products/${product.id}`)
        .send(baseProductBody({ slug: product.slug, images: [keepUrl] }));

      expect(res.status).toBe(200);
      expect(removeMock).toHaveBeenCalledTimes(1);
      expect(removeMock).toHaveBeenCalledWith([pathOf(removeUrl)]);

      const [row] = await db.select().from(productsTable).where(eq(productsTable.id, product.id));
      expect(row.images).toEqual([keepUrl]);
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("a storage deletion failure does not undo or block the successful product delete", async () => {
    await cleanupBySlugPrefix();
    removeMock.mockResolvedValue({ data: null, error: { message: "simulated storage outage" } });
    const imageUrl = fakeImageUrl("product-images");
    const [product] = await db.insert(productsTable).values(baseProductBody({ imageUrl })).returning();

    try {
      const res = await request(testApp).delete(`/api/admin/products/${product.id}`);
      expect(res.status).toBe(204);
      expect(removeMock).toHaveBeenCalled();

      const [row] = await db.select().from(productsTable).where(eq(productsTable.id, product.id));
      expect(row).toBeUndefined();
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("a malformed or foreign-bucket image URL is never sent to storage for deletion", async () => {
    await cleanupBySlugPrefix();
    const [product] = await db
      .insert(productsTable)
      .values(
        baseProductBody({
          imageUrl: "not-a-real-url",
          previewImageUrl: `${SUPABASE_URL}/storage/v1/object/public/not-an-approved-bucket/x.jpg`,
        }),
      )
      .returning();

    try {
      const res = await request(testApp).delete(`/api/admin/products/${product.id}`);
      expect(res.status).toBe(204);
      expect(removeMock).not.toHaveBeenCalled();
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("rejects unauthenticated requests to the product update and delete routes", async () => {
    const updateRes = await request(app).put("/api/admin/products/1").send(baseProductBody());
    expect(updateRes.status).toBe(401);

    const deleteRes = await request(app).delete("/api/admin/products/1");
    expect(deleteRes.status).toBe(401);
  });

  it("removes both the old featured image and its thumbnail derivative when replaced", async () => {
    await cleanupBySlugPrefix();
    const oldUrl = fakeImageUrl("product-images");
    const oldThumb = fakeImageUrl("product-images", `${pathOf(oldUrl).replace(".jpg", "")}-thumb.webp`);
    const newUrl = fakeImageUrl("product-images");
    const [product] = await db.insert(productsTable).values(baseProductBody({ imageUrl: oldUrl, thumbnailUrl: oldThumb })).returning();

    try {
      const res = await request(testApp)
        .put(`/api/admin/products/${product.id}`)
        .send(baseProductBody({ slug: product.slug, imageUrl: newUrl, thumbnailUrl: null }));

      expect(res.status).toBe(200);
      expect(removeMock).toHaveBeenCalledTimes(1);
      expect(removeMock).toHaveBeenCalledWith(expect.arrayContaining([pathOf(oldUrl), pathOf(oldThumb)]));
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("does not remove an image that stops being the featured image but becomes a variety image in the same save", async () => {
    await cleanupBySlugPrefix();
    const sharedUrl = fakeImageUrl("product-images");
    const [product] = await db.insert(productsTable).values(baseProductBody({ imageUrl: sharedUrl, type: "physical" })).returning();

    try {
      // This mirrors the real incident: the same URL moves from being the plain
      // featured image to being referenced via product_images (a variety image)
      // in one save. It must never be treated as orphaned mid-transition.
      const res = await request(testApp)
        .put(`/api/admin/products/${product.id}`)
        .send(
          baseProductBody({
            slug: product.slug,
            type: "physical",
            imageUrl: sharedUrl,
            varieties: [{ name: "Only style", isActive: true, images: [{ url: sharedUrl }] }],
          }),
        );

      expect(res.status).toBe(200);
      expect(removeMock).not.toHaveBeenCalled();
    } finally {
      await cleanupBySlugPrefix();
    }
  });

  it("does not remove a variety image that is reused as the product's featured image in a later save", async () => {
    await cleanupBySlugPrefix();
    const varietyImageUrl = fakeImageUrl("product-images");
    const [product] = await db
      .insert(productsTable)
      .values(baseProductBody({ imageUrl: null, type: "physical" }))
      .returning();

    try {
      // First save: image only exists as a variety image.
      const first = await request(testApp)
        .put(`/api/admin/products/${product.id}`)
        .send(
          baseProductBody({
            slug: product.slug,
            type: "physical",
            varieties: [{ name: "Only style", isActive: true, images: [{ url: varietyImageUrl }] }],
          }),
        );
      expect(first.status).toBe(200);
      removeMock.mockClear();

      // Second save: the same URL is now ALSO the featured image, variety keeps it too.
      // Provably safe — the fresh getReferencedImageUrls() scan sees the variety's
      // product_images row regardless of what the product-level fields say.
      const second = await request(testApp)
        .put(`/api/admin/products/${product.id}`)
        .send(
          baseProductBody({
            slug: product.slug,
            type: "physical",
            imageUrl: varietyImageUrl,
            varieties: [{ name: "Only style", isActive: true, images: [{ url: varietyImageUrl }] }],
          }),
        );
      expect(second.status).toBe(200);
      expect(removeMock).not.toHaveBeenCalled();
    } finally {
      await cleanupBySlugPrefix();
    }
  }, 15000);

  it("removing one variety's image while keeping another variety's identical-URL image never deletes it", async () => {
    await cleanupBySlugPrefix();
    const sharedUrl = fakeImageUrl("product-images");
    const [product] = await db
      .insert(productsTable)
      .values(baseProductBody({ imageUrl: null, type: "physical" }))
      .returning();

    try {
      const first = await request(testApp)
        .put(`/api/admin/products/${product.id}`)
        .send(
          baseProductBody({
            slug: product.slug,
            type: "physical",
            varieties: [
              { name: "Style A", isActive: true, images: [{ url: sharedUrl }] },
              { name: "Style B", isActive: true, images: [{ url: sharedUrl }] },
            ],
          }),
        );
      expect(first.status).toBe(200);
      removeMock.mockClear();

      // Drop Style B (and its copy of the shared URL) but keep Style A referencing it.
      const second = await request(testApp)
        .put(`/api/admin/products/${product.id}`)
        .send(
          baseProductBody({
            slug: product.slug,
            type: "physical",
            varieties: [{ name: "Style A", isActive: true, images: [{ url: sharedUrl }] }],
          }),
        );
      expect(second.status).toBe(200);
      expect(removeMock).not.toHaveBeenCalled();
    } finally {
      await cleanupBySlugPrefix();
    }
  }, 15000);

  it("deletes a genuinely orphaned variety image (and its thumbnail) once no variety references it any more", async () => {
    await cleanupBySlugPrefix();
    const droppedUrl = fakeImageUrl("product-images");
    const droppedThumb = fakeImageUrl("product-images", `${pathOf(droppedUrl).replace(".jpg", "")}-thumb.webp`);
    const [product] = await db
      .insert(productsTable)
      .values(baseProductBody({ imageUrl: null, type: "physical" }))
      .returning();

    try {
      const first = await request(testApp)
        .put(`/api/admin/products/${product.id}`)
        .send(
          baseProductBody({
            slug: product.slug,
            type: "physical",
            varieties: [{ name: "Only style", isActive: true, images: [{ url: droppedUrl, thumbnailUrl: droppedThumb }] }],
          }),
        );
      expect(first.status).toBe(200);
      removeMock.mockClear();

      const second = await request(testApp)
        .put(`/api/admin/products/${product.id}`)
        .send(baseProductBody({ slug: product.slug, type: "physical", varieties: [] }));

      expect(second.status).toBe(200);
      expect(removeMock).toHaveBeenCalledTimes(1);
      expect(removeMock).toHaveBeenCalledWith(expect.arrayContaining([pathOf(droppedUrl), pathOf(droppedThumb)]));
    } finally {
      await cleanupBySlugPrefix();
    }
  }, 15000);
});
