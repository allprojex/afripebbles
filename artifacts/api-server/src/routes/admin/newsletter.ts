import { Router, type IRouter } from "express";
import { eq, or, ilike, desc } from "drizzle-orm";
import { db, newsletterSubscriptionsTable } from "@workspace/db";
import {
  AdminListNewsletterSubscriptionsQueryParams,
  AdminListNewsletterSubscriptionsResponse,
  AdminUnsubscribeNewsletterSubscriptionParams,
  AdminUnsubscribeNewsletterSubscriptionResponse,
} from "@workspace/api-zod";

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

// Manual, support-driven opt-out (e.g. someone emails asking to be removed).
// Idempotent — repeat calls never move an already-set unsubscribedAt.
router.post("/newsletter-subscriptions/:id/unsubscribe", async (req, res): Promise<void> => {
  const params = AdminUnsubscribeNewsletterSubscriptionParams.safeParse({ id: parseFloat(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(newsletterSubscriptionsTable).where(eq(newsletterSubscriptionsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Subscriber not found" });
    return;
  }

  if (existing.unsubscribedAt) {
    res.json(AdminUnsubscribeNewsletterSubscriptionResponse.parse(existing));
    return;
  }

  const [updated] = await db
    .update(newsletterSubscriptionsTable)
    .set({ unsubscribedAt: new Date() })
    .where(eq(newsletterSubscriptionsTable.id, params.data.id))
    .returning();

  res.json(AdminUnsubscribeNewsletterSubscriptionResponse.parse(updated));
});

export default router;
