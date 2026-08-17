import { Router, type IRouter } from "express";
import { asc } from "drizzle-orm";
import { db, testimonialsTable } from "@workspace/db";
import { ListTestimonialsResponse } from "@workspace/api-zod";
import { isPubliclyVisible } from "../lib/visibility";

const router: IRouter = Router();

router.get("/testimonials", async (_req, res): Promise<void> => {
  const testimonials = await db
    .select()
    .from(testimonialsTable)
    .where(isPubliclyVisible(testimonialsTable.status, testimonialsTable.scheduledAt))
    .orderBy(asc(testimonialsTable.displayOrder));

  res.json(ListTestimonialsResponse.parse(testimonials));
});

export default router;
