import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, homepageContentTable } from "@workspace/db";
import { GetHomepageContentResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/homepage-content", async (_req, res): Promise<void> => {
  const [content] = await db.select().from(homepageContentTable).where(eq(homepageContentTable.id, 1));
  res.json(GetHomepageContentResponse.parse(content ?? null));
});

export default router;
