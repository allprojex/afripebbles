import { Router, type IRouter } from "express";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { db, curatedPicksTable } from "@workspace/db";
import {
  AdminListCuratedPicksQueryParams,
  AdminListCuratedPicksResponse,
  AdminCreateCuratedPickBody,
  AdminCreateCuratedPickResponse,
  AdminGetCuratedPickParams,
  AdminGetCuratedPickResponse,
  AdminUpdateCuratedPickParams,
  AdminUpdateCuratedPickBody,
  AdminUpdateCuratedPickResponse,
  AdminDeleteCuratedPickParams,
} from "@workspace/api-zod";
import { isSlugTaken } from "../../lib/slug";

const router: IRouter = Router();

router.get("/curated-picks", async (req, res): Promise<void> => {
  const query = AdminListCuratedPicksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) {
    conditions.push(eq(curatedPicksTable.status, query.data.status));
  }
  if (query.data.search) {
    conditions.push(
      or(ilike(curatedPicksTable.title, `%${query.data.search}%`), ilike(curatedPicksTable.slug, `%${query.data.search}%`)),
    );
  }

  const picks = await db
    .select()
    .from(curatedPicksTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(curatedPicksTable.updatedAt));

  res.json(AdminListCuratedPicksResponse.parse(picks));
});

router.post("/curated-picks", async (req, res): Promise<void> => {
  const body = AdminCreateCuratedPickBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (await isSlugTaken(curatedPicksTable, curatedPicksTable.slug, curatedPicksTable.id, body.data.slug)) {
    res.status(409).json({ error: `Slug "${body.data.slug}" is already in use by another pick.` });
    return;
  }

  const [pick] = await db.insert(curatedPicksTable).values(body.data).returning();
  res.status(201).json(AdminCreateCuratedPickResponse.parse(pick));
});

router.get("/curated-picks/:id", async (req, res): Promise<void> => {
  const params = AdminGetCuratedPickParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [pick] = await db.select().from(curatedPicksTable).where(eq(curatedPicksTable.id, params.data.id));
  if (!pick) {
    res.status(404).json({ error: "Pick not found" });
    return;
  }

  res.json(AdminGetCuratedPickResponse.parse(pick));
});

router.put("/curated-picks/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateCuratedPickParams.safeParse({ id: parseFloat(req.params.id) });
  const body = AdminUpdateCuratedPickBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error!.message });
    return;
  }

  if (await isSlugTaken(curatedPicksTable, curatedPicksTable.slug, curatedPicksTable.id, body.data.slug, params.data.id)) {
    res.status(409).json({ error: `Slug "${body.data.slug}" is already in use by another pick.` });
    return;
  }

  const [pick] = await db
    .update(curatedPicksTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(curatedPicksTable.id, params.data.id))
    .returning();

  if (!pick) {
    res.status(404).json({ error: "Pick not found" });
    return;
  }

  res.json(AdminUpdateCuratedPickResponse.parse(pick));
});

router.delete("/curated-picks/:id", async (req, res): Promise<void> => {
  const params = AdminDeleteCuratedPickParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(curatedPicksTable)
    .where(eq(curatedPicksTable.id, params.data.id))
    .returning({ id: curatedPicksTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Pick not found" });
    return;
  }

  res.status(204).send();
});

export default router;
