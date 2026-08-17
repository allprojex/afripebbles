import { describe, expect, it, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../app";
import { db, ugcEntriesTable } from "@workspace/db";

const DRAFT_TITLE = `__test-draft-ugc-${Date.now()}`;
const PUBLISHED_TITLE = `__test-published-ugc-${Date.now()}`;

async function cleanup() {
  await db.delete(ugcEntriesTable).where(eq(ugcEntriesTable.title, DRAFT_TITLE));
  await db.delete(ugcEntriesTable).where(eq(ugcEntriesTable.title, PUBLISHED_TITLE));
}

describe("public UGC entry visibility filtering (live DB)", () => {
  afterAll(cleanup);

  it("never returns a draft entry from the public route, but does return a published one", async () => {
    await cleanup();

    await db.insert(ugcEntriesTable).values({
      title: DRAFT_TITLE,
      description: "Should never be publicly visible.",
      status: "draft",
    });
    await db.insert(ugcEntriesTable).values({
      title: PUBLISHED_TITLE,
      description: "Should be publicly visible.",
      status: "published",
    });

    try {
      const list = await request(app).get("/api/ugc-entries");
      const titles = list.body.map((e: { title: string }) => e.title);
      expect(titles).not.toContain(DRAFT_TITLE);
      expect(titles).toContain(PUBLISHED_TITLE);
    } finally {
      await cleanup();
    }
  });
});
