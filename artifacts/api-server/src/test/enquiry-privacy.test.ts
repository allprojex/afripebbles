import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";

// Enquiries and newsletter subscribers must never be readable through a
// public endpoint — only POST (submit) exists publicly; reading them is
// admin-only (covered by admin-auth.test.ts).
describe("enquiry and subscriber privacy", () => {
  it("has no public GET for contact enquiries", async () => {
    const res = await request(app).get("/api/contact-enquiries");
    expect(res.status).toBe(404);
  });

  it("has no public GET for collaboration enquiries", async () => {
    const res = await request(app).get("/api/collaboration-enquiries");
    expect(res.status).toBe(404);
  });

  it("has no public GET for newsletter subscribers", async () => {
    const res = await request(app).get("/api/newsletter-subscriptions");
    expect(res.status).toBe(404);
  });
});
