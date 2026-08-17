import { Router, type IRouter } from "express";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import { db, testimonialsTable } from "@workspace/db";
import {
  AdminListTestimonialsQueryParams,
  AdminListTestimonialsResponse,
  AdminCreateTestimonialBody,
  AdminCreateTestimonialResponse,
  AdminGetTestimonialParams,
  AdminGetTestimonialResponse,
  AdminUpdateTestimonialParams,
  AdminUpdateTestimonialBody,
  AdminUpdateTestimonialResponse,
  AdminDeleteTestimonialParams,
} from "@workspace/api-zod";
import { cleanupOrphanedImages } from "../../lib/imageCleanup";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

router.get("/testimonials", async (req, res): Promise<void> => {
  const query = AdminListTestimonialsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) {
    conditions.push(eq(testimonialsTable.status, query.data.status));
  }
  if (query.data.search) {
    conditions.push(
      or(ilike(testimonialsTable.displayName, `%${query.data.search}%`), ilike(testimonialsTable.roleCompany, `%${query.data.search}%`)),
    );
  }

  const testimonials = await db
    .select()
    .from(testimonialsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(testimonialsTable.updatedAt));

  res.json(AdminListTestimonialsResponse.parse(testimonials));
});

router.post("/testimonials", async (req, res): Promise<void> => {
  const body = AdminCreateTestimonialBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [testimonial] = await db.insert(testimonialsTable).values(body.data).returning();
  res.status(201).json(AdminCreateTestimonialResponse.parse(testimonial));
});

router.get("/testimonials/:id", async (req, res): Promise<void> => {
  const params = AdminGetTestimonialParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [testimonial] = await db.select().from(testimonialsTable).where(eq(testimonialsTable.id, params.data.id));
  if (!testimonial) {
    res.status(404).json({ error: "Testimonial not found" });
    return;
  }

  res.json(AdminGetTestimonialResponse.parse(testimonial));
});

router.put("/testimonials/:id", async (req, res): Promise<void> => {
  const params = AdminUpdateTestimonialParams.safeParse({ id: parseFloat(req.params.id) });
  const body = AdminUpdateTestimonialBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: !params.success ? params.error.message : body.error!.message });
    return;
  }

  const [existing] = await db.select().from(testimonialsTable).where(eq(testimonialsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Testimonial not found" });
    return;
  }

  const [testimonial] = await db
    .update(testimonialsTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(testimonialsTable.id, params.data.id))
    .returning();

  if (!testimonial) {
    res.status(404).json({ error: "Testimonial not found" });
    return;
  }

  if (existing.imageUrl && existing.imageUrl !== testimonial.imageUrl) {
    try {
      const cleanup = await cleanupOrphanedImages([existing.imageUrl]);
      if (cleanup.failed.length > 0) {
        logger.warn(
          { testimonialId: testimonial.id, failed: cleanup.failed.length },
          "testimonial update: replaced image could not be removed from storage",
        );
      }
    } catch (err) {
      logger.warn(
        { testimonialId: testimonial.id, err: err instanceof Error ? err.message : String(err) },
        "testimonial update: image cleanup threw",
      );
    }
  }

  res.json(AdminUpdateTestimonialResponse.parse(testimonial));
});

router.delete("/testimonials/:id", async (req, res): Promise<void> => {
  const params = AdminDeleteTestimonialParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(testimonialsTable).where(eq(testimonialsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Testimonial not found" });
    return;
  }

  const [deleted] = await db.delete(testimonialsTable).where(eq(testimonialsTable.id, params.data.id)).returning({ id: testimonialsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Testimonial not found" });
    return;
  }

  try {
    const cleanup = await cleanupOrphanedImages([existing.imageUrl]);
    if (cleanup.failed.length > 0) {
      logger.warn({ testimonialId: deleted.id, failed: cleanup.failed.length }, "testimonial delete: image could not be removed from storage");
    }
  } catch (err) {
    logger.warn({ testimonialId: deleted.id, err: err instanceof Error ? err.message : String(err) }, "testimonial delete: image cleanup threw");
  }

  res.status(204).send();
});

export default router;
