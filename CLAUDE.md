# AfriPebbles

Faith-rooted lifestyle brand site for women — content hub (blog, podcast, curated
picks) built around a shop with seasonal pre-orders for physical products and
direct sales of digital products. Full brief: `attached_assets/Pasted--AfriPebbles-Website-Foundation-Project-Vision-Project-_1785280300520.txt`.

This repo was originally scaffolded on Replit; it now also runs standalone
(confirmed working on Windows). See **Gotchas** below for what that required.

## Run & Operate

- `pnpm install` — install deps (run once, or after pulling dependency changes)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000, from `.env`)
- `pnpm --filter @workspace/afripebbles run dev` — run the frontend (port 5173, from `.env`; proxies `/api` to the api-server)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/afripebbles run test` — Vitest + React Testing Library suite (32 tests, no DB needed — API hooks are mocked)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (`lib/api-spec/openapi.yaml`)
- `pnpm --filter db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` (Postgres connection string) in `artifacts/api-server/.env` and `lib/db/.env` — **not yet set**, see Gotchas.

## Stack

- pnpm workspaces, Node.js 22+, TypeScript 5.9
- Frontend: React 19 + Vite 7 + Tailwind v4 + shadcn/ui (Radix), `wouter` for routing, TanStack Query for data fetching
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) → generates both `lib/api-client-react` (React Query hooks) and `lib/api-zod` (Zod schemas)
- Build: esbuild (CJS-safe ESM bundle) for the API, Vite for the frontend

## Where things live

- `artifacts/afripebbles` — the customer-facing site (Vite + React). Pages in `src/pages/*`; legal/policy pages in `src/pages/legal/*` share one `src/components/LegalPage.tsx` renderer.
- `artifacts/afripebbles/src/content/site.ts` — **single source of truth for all brand copy/config** (brand story, podcast info, nav, social links, contact info, SEO defaults, collaboration types, recommendation categories). Pages must read from here, not hardcode brand facts. `content/legal.ts` and `content/faq.ts` hold the legal-page and FAQ copy.
- `artifacts/afripebbles/src/components/Seo.tsx` — per-route `<title>`/description/canonical/OG/JSON-LD, set via a `useEffect` (no react-helmet — this is a client-only SPA, so a small hook was enough).
- `artifacts/api-server` — Express API, routes in `src/routes/*` (one file per domain: products, blog, podcast, curated, newsletter, collaborations, contact).
- `artifacts/mockup-sandbox` — Replit-only design/mockup preview tool, not part of the shipped product.
- `lib/db/src/schema` — Drizzle table definitions (source of truth for the DB shape). `products.ts` has an `availability` enum (`available` | `preorder` | `coming_soon` | `out_of_stock`) plus preorder dates/fulfilment text/regions/variants.
- `lib/api-spec/openapi.yaml` — source of truth for the API contract; codegen produces `lib/api-client-react` and `lib/api-zod`. Never hand-edit the generated files — edit the spec and run codegen.
- `attached_assets/` — brand brief + generated imagery, referenced from the frontend via the `@assets` Vite alias. `AfriPebbles_Questionnaire_Draft (2).docx` (in the repo's parent Downloads folder, not committed) is the authoritative source for all brand facts — extracted into `src/content/site.ts`.

## Admin Area

`/admin` is a content-management area for the AfriPebbles owner — products, podcast
episodes, articles, recommendations, homepage copy, site settings, and enquiries
are all managed there instead of by editing the database directly.

- **Auth**: Supabase Auth. The frontend (`artifacts/afripebbles/src/admin/`) talks
  to Supabase directly for login/logout/forgot-password/reset-password
  (`@supabase/supabase-js`, anon key — safe to expose). The API server never
  touches passwords; every `/api/admin/*` route is gated by `requireAdmin`
  (`artifacts/api-server/src/middlewares/auth.ts`), which verifies the bearer
  token against Supabase and checks the `admin_users` table — never trusting a
  client-side claim. There is no public self-registration route.
- **First admin**: create the user yourself in the Supabase Dashboard
  (Authentication → Users → Add user — never through the app), then run
  `pnpm --filter scripts run make-admin -- you@example.com` (needs
  `scripts/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`).
  See `scripts/src/make-admin.ts`.
- **Content status**: `products`, `podcast_episodes`, `blog_posts`, and
  `curated_picks` each have a `status` (`draft`/`scheduled`/`published`/`archived`)
  and `scheduledAt`. Public routes only ever return published (or due-scheduled)
  rows — see `isPubliclyVisible()` in `artifacts/api-server/src/lib/visibility.ts`.
- **Storage**: image uploads go through `POST /api/admin/uploads` (admin-only,
  multipart), which validates MIME type/size/dimensions and writes to a Supabase
  Storage bucket with the service-role key — the browser never gets that key.
  Buckets: `product-images`, `podcast-covers`, `article-images`,
  `recommendation-images`, `branding` (all public-read, must be created manually
  in the Supabase Dashboard). This endpoint is intentionally outside the
  OpenAPI/Orval pipeline — see `artifacts/afripebbles/src/admin/lib/adminApi.ts`.
- **Homepage & site settings**: `homepage_content` and `site_settings` are
  singleton tables (id fixed to `1`). Public pages merge the saved values over
  the verified defaults in `src/content/site.ts` via
  `artifacts/afripebbles/src/lib/settings.ts` — an unset field always falls back
  to the confirmed static copy, never a blank or invented value.
- Required env additions beyond the ones in Gotchas: `artifacts/afripebbles/.env`
  needs `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; `artifacts/api-server/.env`
  needs `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (service-role is a secret,
  server-only).

## Architecture decisions

- Products use an `availability` enum rather than a single `isPreOrder` boolean, because the shop needs to distinguish available / pre-order / coming-soon / out-of-stock, not just "is or isn't a pre-order."
- Frontend never calls the API with an absolute URL; it always fetches relative `/api/...` paths. In production this relies on a router that puts both processes behind one origin; locally it relies on the Vite dev proxy (see `vite.config.ts`).
- No cart/checkout implemented — by design. The shop's calls-to-action ("Join the Pre-order List," "Enquire About This Product," etc.) route to `/contact` with the product pre-filled, rather than faking a purchase. Don't wire up a fake "Added to bag" success state; either build a real cart or keep the honest enquiry flow.
- Public route paths were renamed to match brand language: the blog lives at `/journal` (file: `src/pages/blog/*`, unchanged) and curated picks live at `/recommendations` (file: `src/pages/curated.tsx`, unchanged) — internal filenames were kept to avoid churn, only the public URL/label changed.

## Product

- Full brand ecosystem per `attached_assets/` and the questionnaire: home, about, The Glow Up Sanctuary podcast (pre-launch/coming-soon state), shop (digital + seasonal pre-order decor), journal, recommendations (with affiliate disclosure), collaborate, community (newsletter), contact, plus 8 legal/policy pages — all scaffolded, typechecking, and tested.
- Not yet built: cart, checkout/payments, order management, admin/content authoring UI, seed data. No real product/episode/blog content exists yet — every list page's empty state is real (not a bug) until the DB has rows.

## User preferences

- Keep the full brand ecosystem (blog/podcast/community/etc.) rather than trimming the repo down to shop-only.
- Database: user is provisioning Supabase Postgres (not Neon) — `DATABASE_URL` not yet supplied as of this writing.
- Don't invent brand facts (prices, testimonials, episodes, contact details, policies, etc.) — use `src/content/site.ts` / `legal.ts` and mark anything unconfirmed rather than guessing. This was an explicit, repeated instruction across two sessions.

## Gotchas

- **This repo was built assuming a Replit (Linux x64) host.** `pnpm-workspace.yaml` had `overrides` that stripped every non-Linux-x64 native binary (esbuild, rollup, lightningcss, @tailwindcss/oxide) to shrink the Replit deploy image — this broke `pnpm install` on Windows. The win32-x64 exclusions were removed; if `pnpm install` starts failing on native bindings again, check that file first.
- `vite.config.ts` (both `afripebbles` and `mockup-sandbox`) requires `PORT` and `BASE_PATH` env vars and throws if unset — these came from Replit's workflow injection. Locally they're supplied via `.env` + `dotenv-cli` (`dev` script). Copy `.env.example` → `.env` in each package if it's missing.
- `artifacts/api-server`'s `dev`/`start` scripts read `.env` via Node's native `--env-file-if-exists` flag (Node 20.6+, no dependency needed) rather than dotenv-cli.
- The frontend fetches relative `/api/*` with no base URL — locally this only works because of the `server.proxy` block added to `artifacts/afripebbles/vite.config.ts` (proxies to `API_PORT`, default 5000). Don't remove that proxy without replacing it with something else that makes `/api` resolve.
- `.env` files are gitignored; `.env.example` in each package documents what's required.
- `DATABASE_URL` is not set yet — `lib/db` and `artifacts/api-server` will throw on startup until it is. Get it from the Supabase project (Project Settings → Database → Connection string) and put it in both `artifacts/api-server/.env` and `lib/db/.env`, then run `pnpm --filter db run push` to create the tables.
- `artifacts/mockup-sandbox` was not touched by the Windows fixes above beyond the shared `pnpm-workspace.yaml` change — it's a Replit design tool, not part of the product, and lower priority to keep working.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- `replit.md` was the original placeholder doc scaffolded by Replit's agent; this file supersedes it for local/Claude Code work.
