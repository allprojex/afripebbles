import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, homepageContentTable } from "@workspace/db";
import { AdminGetHomepageContentResponse, AdminUpdateHomepageContentBody, AdminUpdateHomepageContentResponse } from "@workspace/api-zod";

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

  const [content] = await db
    .insert(homepageContentTable)
    .values({ id: 1, ...body.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: homepageContentTable.id,
      set: { ...body.data, updatedAt: new Date() },
    })
    .returning();

  res.json(AdminUpdateHomepageContentResponse.parse(content));
});

export default router;
