import { describe, expect, it, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../app";
import { db, testimonialsTable } from "@workspace/db";

const DRAFT_NAME = `__test-draft-testimonial-${Date.now()}`;
const PUBLISHED_NAME = `__test-published-testimonial-${Date.now()}`;

async function cleanup() {
  await db.delete(testimonialsTable).where(eq(testimonialsTable.displayName, DRAFT_NAME));
  await db.delete(testimonialsTable).where(eq(testimonialsTable.displayName, PUBLISHED_NAME));
}

describe("public testimonial visibility filtering (live DB)", () => {
  afterAll(cleanup);

  it("never returns a draft testimonial from the public route, but does return a published one", async () => {
    await cleanup();

    await db.insert(testimonialsTable).values({
      displayName: DRAFT_NAME,
      testimonialText: "Should never be publicly visible.",
      status: "draft",
    });
    await db.insert(testimonialsTable).values({
      displayName: PUBLISHED_NAME,
      testimonialText: "Should be publicly visible.",
      status: "published",
    });

    try {
      const list = await request(app).get("/api/testimonials");
      const names = list.body.map((t: { displayName: string }) => t.displayName);
      expect(names).not.toContain(DRAFT_NAME);
      expect(names).toContain(PUBLISHED_NAME);
    } finally {
      await cleanup();
    }
  });
});
