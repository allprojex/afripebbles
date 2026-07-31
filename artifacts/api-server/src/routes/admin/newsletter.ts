import { Router, type IRouter } from "express";
import { or, ilike, desc } from "drizzle-orm";
import { db, newsletterSubscriptionsTable } from "@workspace/db";
import { AdminListNewsletterSubscriptionsQueryParams, AdminListNewsletterSubscriptionsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/newsletter-subscriptions", async (req, res): Promise<void> => {
  const query = AdminListNewsletterSubscriptionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const subscribers = await db
    .select()
    .from(newsletterSubscriptionsTable)
    .where(
      query.data.search
        ? or(
            ilike(newsletterSubscriptionsTable.email, `%${query.data.search}%`),
            ilike(newsletterSubscriptionsTable.firstName, `%${query.data.search}%`),
          )
        : undefined,
    )
    .orderBy(desc(newsletterSubscriptionsTable.createdAt));

  res.json(AdminListNewsletterSubscriptionsResponse.parse(subscribers));
});

export default router;
