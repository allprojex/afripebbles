import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, curatedPicksTable } from "@workspace/db";
import {
  ListCuratedPicksQueryParams,
  ListCuratedPicksResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/curated-picks", async (req, res): Promise<void> => {
  const query = ListCuratedPicksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const picks = query.data.category
    ? await db
        .select()
        .from(curatedPicksTable)
        .where(eq(curatedPicksTable.category, query.data.category))
    : await db.select().from(curatedPicksTable);

  res.json(ListCuratedPicksResponse.parse(picks));
});

export default router;
