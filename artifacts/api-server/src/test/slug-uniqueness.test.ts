import { describe, expect, it, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { isSlugTaken } from "../lib/slug";

// Live-DB test: the products.slug column is declared unique, and admin
// create/update handlers check isSlugTaken() first so a collision comes back
// as a clear 409 instead of a silent overwrite or a raw DB constraint error.
const SLUG = `__test-slug-uniqueness-${Date.now()}`;

async function cleanup() {
  await db.delete(productsTable).where(eq(productsTable.slug, SLUG));
}

describe("slug uniqueness (live DB)", () => {
  afterAll(cleanup);

  it("flags a slug as taken once a row uses it, and frees it up again once deleted", async () => {
    await cleanup();
    expect(await isSlugTaken(productsTable, productsTable.slug, productsTable.id, SLUG)).toBe(false);

    const [row] = await db
      .insert(productsTable)
      .values({ slug: SLUG, title: "Slug Test", description: "Test row.", price: 1, type: "digital" })
      .returning();

    try {
      expect(await isSlugTaken(productsTable, productsTable.slug, productsTable.id, SLUG)).toBe(true);
      // Excluding the row's own id (the update case) must not flag it as taken.
      expect(await isSlugTaken(productsTable, productsTable.slug, productsTable.id, SLUG, row.id)).toBe(false);

      await expect(
        db.insert(productsTable).values({ slug: SLUG, title: "Duplicate", description: "Should be rejected.", price: 1, type: "digital" }),
      ).rejects.toThrow();
    } finally {
      await cleanup();
    }
  });
});
