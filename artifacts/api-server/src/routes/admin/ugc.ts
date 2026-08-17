import { Router, type IRouter } from "express";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { db, ugcEntriesTable } from "@workspace/db";
import {
  AdminListUgcEntriesQueryParams,
  AdminListUgcEntriesResponse,
  AdminCreateUgcEntryBody,
  AdminCreateUgcEntryResponse,
  AdminGetUgcEntryParams,
  AdminGetUgcEntryResponse,
  AdminUpdateUgcEntryParams,
  AdminUpdateUgcEntryBody,
  AdminUpdateUgcEntryResponse,
  AdminDeleteUgcEntryParams,
} from "@workspace/api-zod";
import { cleanupOrphanedImages } from "../../lib/imageCleanup";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/ugc-entries", async (req, res): Promise<void> => {
  const query = AdminListUgcEntriesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) {
    conditions.push(eq(ugcEntriesTable.status, query.data.status));
  }
  if (query.data.search) {
    conditions.push(
      or(ilike(ugcEntriesTable.title, `%${query.data.search}%`), ilike(ugcEntriesTable.brandName, `%${query.data.search}%`)),
    );
  }

  const entries = await db
    .select()
    .from(ugcEntriesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ugcEntriesTable.updatedAt));

  res.json(AdminListUgcEntriesResponse.parse(entries));
});

router.post("/ugc-entries", async (req, res): Promise<void> => {
  const body = AdminCreateUgcEntryBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [entry] = await db.insert(ugcEntriesTable).values(body.data).returning();
  res.status(201).json(AdminCreateUgcEntryResponse.parse(entry));
});

router.get("/ugc-entries/:id", async (req, res): Promise<void> => {
  const params = AdminGetUgcEntryParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db.select().from(ugcEntriesTable).where(eq(ugcEntriesTable.id, params.data.id));
  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  res.json(AdminGetUgcEntryResponse.parse(entry));
});

router.put("/ugc-entries/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateUgcEntryParams.safeParse({ id: parseFloat(req.params.id) });
  const body = AdminUpdateUgcEntryBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error!.message });
    return;
  }

  const [existing] = await db.select().from(ugcEntriesTable).where(eq(ugcEntriesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  const [entry] = await db
    .update(ugcEntriesTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(ugcEntriesTable.id, params.data.id))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  if (existing.imageUrl && existing.imageUrl !== entry.imageUrl) {
    try {
      const cleanup = await cleanupOrphanedImages([existing.imageUrl]);
      if (cleanup.failed.length > 0) {
        logger.warn({ entryId: entry.id, failed: cleanup.failed.length }, "UGC entry update: replaced image could not be removed from storage");
      }
    } catch (err) {
      logger.warn({ entryId: entry.id, err: err instanceof Error ? err.message : String(err) }, "UGC entry update: image cleanup threw");
    }
  }

  res.json(AdminUpdateUgcEntryResponse.parse(entry));
});

router.delete("/ugc-entries/:id", async (req, res): Promise<void> => {
  const params = AdminDeleteUgcEntryParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(ugcEntriesTable).where(eq(ugcEntriesTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  const [deleted] = await db.delete(ugcEntriesTable).where(eq(ugcEntriesTable.id, params.data.id)).returning({ id: ugcEntriesTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  try {
    const cleanup = await cleanupOrphanedImages([existing.imageUrl]);
    if (cleanup.failed.length > 0) {
      logger.warn({ entryId: deleted.id, failed: cleanup.failed.length }, "UGC entry delete: image could not be removed from storage");
    }
  } catch (err) {
    logger.warn({ entryId: deleted.id, err: err instanceof Error ? err.message : String(err) }, "UGC entry delete: image cleanup threw");
  }

  res.status(204).send();
});

export default router;
