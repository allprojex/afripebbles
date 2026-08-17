import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, newsletterSubscriptionsTable } from "@workspace/db";
import {
  SubscribeNewsletterBody,
  SubscribeNewsletterResponse,
  UnsubscribeNewsletterBody,
  UnsubscribeNewsletterResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/newsletter-subscriptions", async (req, res): Promise<void> => {
  const parsed = SubscribeNewsletterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!parsed.data.consent) {
    res.status(400).json({ error: "Consent to receive emails is required." });
    return;
  }

  const [existing] = await db
    .select()
    .from(newsletterSubscriptionsTable)
    .where(eq(newsletterSubscriptionsTable.email, parsed.data.email));

  if (existing) {
    if (!existing.unsubscribedAt) {
      res.status(409).json({ error: "Email already subscribed" });
      return;
    }

    // Explicit, consent-checked resubmission of the sign-up form is the only
    // path that can flip unsubscribedAt back to null — never a side effect
    // of anything else, so resubscription is always a deliberate action.
    const [resubscribed] = await db
      .update(newsletterSubscriptionsTable)
      .set({
        firstName: parsed.data.firstName ?? existing.firstName,
        unsubscribedAt: null,
        consentGivenAt: new Date(),
      })
      .where(eq(newsletterSubscriptionsTable.id, existing.id))
      .returning();

    res.status(201).json(SubscribeNewsletterResponse.parse(resubscribed));
    return;
  }

  const [subscription] = await db
    .insert(newsletterSubscriptionsTable)
    .values({ email: parsed.data.email, firstName: parsed.data.firstName })
    .returning();

  res.status(201).json(SubscribeNewsletterResponse.parse(subscription));
});

router.post("/newsletter-subscriptions/unsubscribe", async (req, res): Promise<void> => {
  const parsed = UnsubscribeNewsletterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(newsletterSubscriptionsTable)
    .where(eq(newsletterSubscriptionsTable.unsubscribeToken, parsed.data.token));

  if (!existing) {
    res.status(404).json({ error: "Unknown unsubscribe link" });
    return;
  }

  // Idempotent — a repeated unsubscribe replay never overwrites the original timestamp.
  if (existing.unsubscribedAt) {
    res.status(200).json(UnsubscribeNewsletterResponse.parse(existing));
    return;
  }

  const [updated] = await db
    .update(newsletterSubscriptionsTable)
    .set({ unsubscribedAt: new Date() })
    .where(eq(newsletterSubscriptionsTable.id, existing.id))
    .returning();

  res.status(200).json(UnsubscribeNewsletterResponse.parse(updated));
});

export default router;
