import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";
import { AdminGetSiteSettingsResponse, AdminUpdateSiteSettingsBody, AdminUpdateSiteSettingsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_SITE_SETTINGS = {
  id: 1,
  brandName: null,
  tagline: null,
  contactEmail: null,
  supportEmail: null,
  collaborationEmail: null,
  whatsappNumber: null,
  instagramUrl: null,
  facebookUrl: null,
  youtubeUrl: null,
  tiktokUrl: null,
  seoDefaultTitle: null,
  seoDefaultDescription: null,
  canonicalUrl: null,
  socialShareImageUrl: null,
  businessCountry: null,
  supportedRegions: [] as string[],
  defaultCurrency: null,
  newsletterWording: null,
  footerText: null,
  podcastLaunchStatus: null,
  shopStatus: null,
  preorderNotice: null,
  shippingNotice: null,
  affiliateDisclosure: null,
  privacyContactInfo: null,
  updatedAt: new Date(0),
};

router.get("/site-settings", async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.id, 1));
  res.json(AdminGetSiteSettingsResponse.parse(settings ?? DEFAULT_SITE_SETTINGS));
});

router.put("/site-settings", async (req, res): Promise<void> => {
  const body = AdminUpdateSiteSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [settings] = await db
    .insert(siteSettingsTable)
    .values({ id: 1, ...body.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteSettingsTable.id,
      set: { ...body.data, updatedAt: new Date() },
    })
    .returning();

  res.json(AdminUpdateSiteSettingsResponse.parse(settings));
});

export default router;
