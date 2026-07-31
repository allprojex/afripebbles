import { Router, type IRouter } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, curatedPicksTable } from "@workspace/db";
import { ListCuratedPicksQueryParams, ListCuratedPicksResponse } from "@workspace/api-zod";
import { isPubliclyVisible } from "../lib/visibility";

const router: IRouter = Router();

router.get("/curated-picks", async (req, res): Promise<void> => {
  const query = ListCuratedPicksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [isPubliclyVisible(curatedPicksTable.status, curatedPicksTable.scheduledAt)];
  if (query.data.category) {
    conditions.push(eq(curatedPicksTable.category, query.data.category));
  }

  const picks = await db
    .select()
    .from(curatedPicksTable)
    .where(and(...conditions))
    .orderBy(asc(curatedPicksTable.displayOrder));

  res.json(ListCuratedPicksResponse.parse(picks));
});

export default router;
