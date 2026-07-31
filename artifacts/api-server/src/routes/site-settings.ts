import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";
import { GetSiteSettingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/site-settings", async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.id, 1));
  res.json(GetSiteSettingsResponse.parse(settings ?? null));
});

export default router;
