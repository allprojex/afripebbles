import { Router, type IRouter } from "express";
import { db, newsletterSubscriptionsTable } from "@workspace/db";
import {
  SubscribeNewsletterBody,
  SubscribeNewsletterResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/newsletter-subscriptions", async (req, res): Promise<void> => {
  const parsed = SubscribeNewsletterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Check for duplicate
  const existing = await db
    .select()
    .from(newsletterSubscriptionsTable)
    .where(
      (await import("drizzle-orm")).eq(
        newsletterSubscriptionsTable.email,
        parsed.data.email,
      ),
    );

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already subscribed" });
    return;
  }

  const [subscription] = await db
    .insert(newsletterSubscriptionsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(SubscribeNewsletterResponse.parse(subscription));
});

export default router;
