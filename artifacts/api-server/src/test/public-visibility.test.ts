import { describe, expect, it, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../app";
import { db, productsTable } from "@workspace/db";

// Live-DB test: proves the shared isPubliclyVisible() filter (reused by
// products/podcast/blog/curated) actually keeps draft content off public
// routes, using the real connected database. Rows are namespaced with a
// unique test slug and always removed afterwards, win or lose.
const DRAFT_SLUG = `__test-draft-visibility-${Date.now()}`;
const PUBLISHED_SLUG = `__test-published-visibility-${Date.now()}`;

async function cleanup() {
  await db.delete(productsTable).where(eq(productsTable.slug, DRAFT_SLUG));
  await db.delete(productsTable).where(eq(productsTable.slug, PUBLISHED_SLUG));
}

describe("public product visibility filtering (live DB)", () => {
  afterAll(cleanup);

  it("never returns a draft product from public routes, but does return a published one", async () => {
    await cleanup();

    const [draft] = await db
      .insert(productsTable)
      .values({
        slug: DRAFT_SLUG,
        title: "Test Draft Product",
        description: "Should never be publicly visible.",
        price: 10,
        type: "digital",
        status: "draft",
      })
      .returning();

    const [published] = await db
      .insert(productsTable)
      .values({
        slug: PUBLISHED_SLUG,
        title: "Test Published Product",
        description: "Should be publicly visible.",
        price: 10,
        type: "digital",
        status: "published",
      })
      .returning();

    try {
      const list = await request(app).get("/api/products");
      const slugs = list.body.map((p: { slug: string }) => p.slug);
      expect(slugs).not.toContain(DRAFT_SLUG);
      expect(slugs).toContain(PUBLISHED_SLUG);

      const draftDetail = await request(app).get(`/api/products/${draft.id}`);
      expect(draftDetail.status).toBe(404);

      const publishedDetail = await request(app).get(`/api/products/${published.id}`);
      expect(publishedDetail.status).toBe(200);
      expect(publishedDetail.body.slug).toBe(PUBLISHED_SLUG);
    } finally {
      await cleanup();
    }
  });
});
