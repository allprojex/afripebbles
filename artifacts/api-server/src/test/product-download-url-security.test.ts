import { describe, expect, it, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../app";
import { db, productsTable } from "@workspace/db";

// Live-DB regression test for the downloadUrl leak: public product responses
// must never include the private storage location of a digital file, even
// though the DB row (and the admin API) legitimately has one.
const SLUG = `__test-download-url-security-${Date.now()}`;
const PRIVATE_DOWNLOAD_URL = "https://example-storage.internal/private/secret-file.zip";

async function cleanup() {
  await db.delete(productsTable).where(eq(productsTable.slug, SLUG));
}

describe("public product responses never expose downloadUrl (live DB)", () => {
  afterAll(cleanup);

  it("strips downloadUrl and exposes hasDownload instead, on both list and detail routes", async () => {
    await cleanup();

    const [product] = await db
      .insert(productsTable)
      .values({
        slug: SLUG,
        title: "Test Digital Product",
        description: "Has a private download URL that must never reach the public API.",
        price: 10,
        type: "digital",
        status: "published",
        downloadUrl: PRIVATE_DOWNLOAD_URL,
      })
      .returning();

    try {
      const list = await request(app).get("/api/products");
      const listed = list.body.find((p: { slug: string }) => p.slug === SLUG);
      expect(listed).toBeDefined();
      expect(listed.downloadUrl).toBeUndefined();
      expect(listed.hasDownload).toBe(true);
      expect(JSON.stringify(listed)).not.toContain(PRIVATE_DOWNLOAD_URL);

      const detail = await request(app).get(`/api/products/${product.id}`);
      expect(detail.status).toBe(200);
      expect(detail.body.downloadUrl).toBeUndefined();
      expect(detail.body.hasDownload).toBe(true);
      expect(JSON.stringify(detail.body)).not.toContain(PRIVATE_DOWNLOAD_URL);
    } finally {
      await cleanup();
    }
  });

  it("does not set hasDownload when there is no download file", async () => {
    await cleanup();

    await db.insert(productsTable).values({
      slug: SLUG,
      title: "Test Physical Product",
      description: "No download file.",
      price: 10,
      type: "physical",
      status: "published",
    });

    try {
      const list = await request(app).get("/api/products");
      const listed = list.body.find((p: { slug: string }) => p.slug === SLUG);
      expect(listed.hasDownload).toBe(false);
    } finally {
      await cleanup();
    }
  });
});
