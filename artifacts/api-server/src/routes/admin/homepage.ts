import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, homepageContentTable } from "@workspace/db";
import { AdminGetHomepageContentResponse, AdminUpdateHomepageContentBody, AdminUpdateHomepageContentResponse } from "@workspace/api-zod";
import { cleanupOrphanedImages } from "../../lib/imageCleanup";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

const DEFAULT_HOMEPAGE_CONTENT = {
  id: 1,
  heroHeading: null,
  heroSubheading: null,
  heroImageUrl: null,
  primaryCtaLabel: null,
  primaryCtaHref: null,
  secondaryCtaLabel: null,
  secondaryCtaHref: null,
  showPodcastSection: true,
  showShopSection: true,
  showJournalSection: true,
  showRecommendationsSection: true,
  showCollaborateSection: true,
  showTestimonialsSection: true,
  showNewsletterSection: true,
  newsletterHeading: null,
  newsletterBody: null,
  collaborateHeading: null,
  collaborateBody: null,
  updatedAt: new Date(0),
};

router.get("/homepage-content", async (_req, res): Promise<void> => {
  const [content] = await db.select().from(homepageContentTable).where(eq(homepageContentTable.id, 1));
  res.json(AdminGetHomepageContentResponse.parse(content ?? DEFAULT_HOMEPAGE_CONTENT));
});

router.put("/homepage-content", async (req, res): Promise<void> => {
  const body = AdminUpdateHomepageContentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [existing] = await db.select().from(homepageContentTable).where(eq(homepageContentTable.id, 1));

  const [content] = await db
    .insert(homepageContentTable)
    .values({ id: 1, ...body.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: homepageContentTable.id,
      set: { ...body.data, updatedAt: new Date() },
    })
    .returning();

  if (existing?.heroImageUrl && existing.heroImageUrl !== content.heroImageUrl) {
    try {
      const cleanup = await cleanupOrphanedImages([existing.heroImageUrl]);
      if (cleanup.failed.length > 0) {
        logger.warn({ failed: cleanup.failed.length }, "homepage content update: replaced hero image could not be removed from storage");
      }
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : String(err) }, "homepage content update: image cleanup threw");
    }
  }

  res.json(AdminUpdateHomepageContentResponse.parse(content));
});

export default router;
