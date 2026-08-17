import { describe, expect, it, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../app";
import { db, newsletterSubscriptionsTable } from "@workspace/db";

const EMAIL = `__test-newsletter-consent-${Date.now()}@example.com`;

async function cleanup() {
  await db.delete(newsletterSubscriptionsTable).where(eq(newsletterSubscriptionsTable.email, EMAIL));
}

describe("newsletter consent and unsubscribe (live DB)", () => {
  afterAll(cleanup);

  it("rejects a subscription without consent", async () => {
    await cleanup();
    const res = await request(app).post("/api/newsletter-subscriptions").send({ email: EMAIL, consent: false });
    expect(res.status).toBe(400);

    const rows = await db.select().from(newsletterSubscriptionsTable).where(eq(newsletterSubscriptionsTable.email, EMAIL));
    expect(rows).toHaveLength(0);
  });

  it("subscribes with consent, rejects a duplicate active subscription, then unsubscribes and resubscribes", async () => {
    await cleanup();

    const created = await request(app).post("/api/newsletter-subscriptions").send({ email: EMAIL, consent: true });
    expect(created.status).toBe(201);
    expect(created.body.unsubscribedAt).toBeNull();
    const token = created.body.unsubscribeToken;
    expect(typeof token).toBe("string");

    try {
      // Duplicate active subscription is rejected.
      const duplicate = await request(app).post("/api/newsletter-subscriptions").send({ email: EMAIL, consent: true });
      expect(duplicate.status).toBe(409);

      // Unsubscribe via token.
      const unsubscribed = await request(app).post("/api/newsletter-subscriptions/unsubscribe").send({ token });
      expect(unsubscribed.status).toBe(200);
      expect(unsubscribed.body.unsubscribedAt).not.toBeNull();

      // Repeated unsubscribe is idempotent — same timestamp, no error.
      const repeat = await request(app).post("/api/newsletter-subscriptions/unsubscribe").send({ token });
      expect(repeat.status).toBe(200);
      expect(repeat.body.unsubscribedAt).toBe(unsubscribed.body.unsubscribedAt);

      // Explicit resubscribe via the form (only path that can revive it) clears unsubscribedAt.
      const resubscribed = await request(app).post("/api/newsletter-subscriptions").send({ email: EMAIL, consent: true });
      expect(resubscribed.status).toBe(201);
      expect(resubscribed.body.unsubscribedAt).toBeNull();
    } finally {
      await cleanup();
    }
  });

  it("returns 404 for an unknown unsubscribe token", async () => {
    const res = await request(app).post("/api/newsletter-subscriptions/unsubscribe").send({ token: "not-a-real-token" });
    expect(res.status).toBe(404);
  });
});
