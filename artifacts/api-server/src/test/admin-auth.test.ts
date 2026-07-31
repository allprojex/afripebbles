import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";

// Every /api/admin/* route must reject requests with no or garbage bearer
// token before touching any data — this suite never hits Supabase or writes
// to the database, it only proves the gate itself is in place.
const ADMIN_ROUTES: { method: "get" | "post" | "put" | "patch" | "delete"; path: string }[] = [
  { method: "get", path: "/api/admin/me" },
  { method: "get", path: "/api/admin/dashboard" },
  { method: "get", path: "/api/admin/products" },
  { method: "post", path: "/api/admin/products" },
  { method: "get", path: "/api/admin/products/1" },
  { method: "put", path: "/api/admin/products/1" },
  { method: "delete", path: "/api/admin/products/1" },
  { method: "get", path: "/api/admin/podcast-episodes" },
  { method: "post", path: "/api/admin/podcast-episodes" },
  { method: "get", path: "/api/admin/blog-posts" },
  { method: "post", path: "/api/admin/blog-posts" },
  { method: "get", path: "/api/admin/curated-picks" },
  { method: "post", path: "/api/admin/curated-picks" },
  { method: "get", path: "/api/admin/homepage-content" },
  { method: "put", path: "/api/admin/homepage-content" },
  { method: "get", path: "/api/admin/site-settings" },
  { method: "put", path: "/api/admin/site-settings" },
  { method: "get", path: "/api/admin/contact-enquiries" },
  { method: "patch", path: "/api/admin/contact-enquiries/1" },
  { method: "get", path: "/api/admin/collaboration-enquiries" },
  { method: "patch", path: "/api/admin/collaboration-enquiries/1" },
  { method: "get", path: "/api/admin/newsletter-subscriptions" },
  { method: "post", path: "/api/admin/uploads" },
  { method: "delete", path: "/api/admin/uploads" },
];

describe("admin route protection", () => {
  for (const { method, path } of ADMIN_ROUTES) {
    it(`${method.toUpperCase()} ${path} rejects requests with no bearer token`, async () => {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
    });

    it(`${method.toUpperCase()} ${path} rejects requests with a garbage bearer token`, async () => {
      const res = await request(app)[method](path).set("Authorization", "Bearer not-a-real-token");
      // 401 once Supabase rejects the token, or 503 if Supabase credentials
      // aren't configured in this environment yet — never a success status.
      expect([401, 503]).toContain(res.status);
    });
  }
});
