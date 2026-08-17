import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import { db, ugcEntriesTable } from "@workspace/db";
import { ListUgcEntriesResponse } from "@workspace/api-zod";
import { isPubliclyVisible } from "../lib/visibility";

const router: IRouter = Router();

router.get("/ugc-entries", async (_req, res): Promise<void> => {
  const entries = await db
    .select()
    .from(ugcEntriesTable)
    .where(isPubliclyVisible(ugcEntriesTable.status, ugcEntriesTable.scheduledAt))
    .orderBy(asc(ugcEntriesTable.displayOrder));

  res.json(ListUgcEntriesResponse.parse(entries));
});

export default router;
