# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev     # dev server on http://localhost:3000
npm run build   # production build (also the type check, since there is no separate tsc script)
npm run lint    # eslint (next core-web-vitals + typescript config)
npm test        # vitest: unit tests for the pure helpers in lib/ (lib/**/*.test.ts)
npx vitest run lib/seasons.test.ts   # a single test file
npm run test:e2e   # Playwright (e2e/): against `next start` on :3100 after `npm run build`, or E2E_BASE_URL; member tests need E2E_EMAIL/E2E_PASSWORD
npm run db:types   # supabase gen types → types/supabase.generated.ts (needs the Supabase CLI login and SUPABASE_PROJECT_ID)
```

CI (`.github/workflows/ci.yml`, Node 22) runs `npm ci`, `npm run lint`, `npm test`, `npm run build` and the public e2e tests (pages render, signed-out redirect, axe finds no serious accessibility issues) with dummy env values. Tests cover pure functions only (no database); keep new parsing/matching logic in plain `lib/` modules so it can be tested.

Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `TMDB_API_KEY` (required to build/run); optional: `NEXT_PUBLIC_SITE_URL`, `BREVO_API_KEY`/`BREVO_LIST_ID`/`BREVO_DOI_TEMPLATE_ID` (newsletter), `FEEDBACK_SALT` (IP hashing), `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `ANTHROPIC_API_KEY` (admin shelf scan, `lib/ai/shelf-scan.ts`; runtime only). Background jobs and push: `SUPABASE_SERVICE_ROLE_KEY` (`lib/supabase/admin.ts`, bypasses RLS — only for code that decides itself whose data it touches), `CRON_SECRET` (Vercel Cron, `vercel.json` → `app/api/cron/*`, excluded from the proxy), `BREVO_SENDER_EMAIL`/`BREVO_SENDER_NAME` (transactional mail, `lib/email.ts`), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` (web push, `lib/push.ts`, `public/sw.js`). `/admin/status` shows which are set.

## Stack

Next.js 16 (App Router) + React 19, Supabase (`@supabase/ssr`) for auth and data, TMDB for film/series metadata, Tailwind v4 + Radix/shadcn-style primitives in `components/ui/`, `sonner` toasts, `@zxing` for camera barcode scanning. Path alias `@/*` maps to the repo root. Deployed on Vercel.

## Architecture

**Port of an Android app.** This is the web version of the FilmVault Android app (Kotlin). Many comments reference Kotlin files (`CollectionRepository.kt`, ViewModels, `strings.xml`) — table/column names and business logic are deliberately kept 1:1 with Android, so don't "improve" schemas or naming in isolation. The database schema and migrations live in the Android repo (`FilmVault/supabase/sql/*.sql`); migrations written from the web repo go in `supabase/sql/` here (listed in order in its README, to be copied there too). Comments cite which migration a column or RLS policy comes from (e.g. `series_support.sql`, `custom_covers.sql`). Code must keep working before a migration has run: optional columns are typed `?:`, writes avoid sending them when unused, and a missing table/column/function is detected with `isMissingError()` (`lib/admin/migrations.ts`) to fall back or show a "not ready" message. Every migration has an entry with a read-only probe in `MIGRATIONS` there, which `/admin/status` shows; add one for each new migration.

**Data access = Server Actions in `actions/`.** Each `actions/*.ts` file is `"use server"` and talks to Supabase via `createClient()` from `lib/supabase/server.ts`, then calls `revalidatePath`. Pages in `app/` are Server Components that call these actions directly and hand the data to a `*-client.tsx` component in `components/` for interactivity. A `"use server"` file may only export async functions — shared classes/types/constants go in plain modules (e.g. error classes in `lib/errors.ts`). Use `requireUserId()` from `lib/auth.ts` for "must be signed in". PostgREST caps a response at 1000 rows: any list that can grow (collection items, logs, wishlist, profiles) goes through `fetchAll()` from `lib/supabase/fetch-all.ts` with a stable `.order()`. Collection writes live in `actions/collections.ts`, the user's barcode/scan flows in `actions/barcodes.ts`, the admin approval queue in `actions/approvals.ts`.

**Authorization relies on Supabase RLS.** Reads of other users' data (friends' collections, public collections) trust RLS policies rather than checking in app code. Admin-only pages and mutating admin actions both call `requireAdmin()` (`lib/require-admin.ts`) — keep that double check when adding admin features — and mutating admin actions record themselves with `logAdminAction()` (`lib/admin/log.ts`, shown on `/admin/log`). Admin reads of other members' private data (collections, copies) go through `security definer` SQL functions that check `is_admin` themselves (e.g. `admin_user_overview`), since RLS keeps those rows owner-only.

**Auth gating in `proxy.ts` → `lib/supabase/proxy.ts`** (Next 16 renamed middleware to proxy). Refreshes the Supabase session on every request and redirects: unauthenticated users to `/login`, authenticated users away from `/login`/`/register` to `/dashboard`. `PUBLIC_PATHS` and `ALWAYS_ACCESSIBLE_PATHS` there control which routes are public (`/`, `/c/[id]` public collections, `/v/[userId]` shared wishlists, `/gids` guides, `/privacy`, `/feedback`, `/nieuwsbrief`). It also sets the `fv_src` acquisition cookie and syncs the `fv_locale` cookie from `profiles.language`. Route groups: `app/(app)/` is the logged-in shell (`NavShell`, profile loaded in its layout), `app/(auth)/` is login/register.

**TMDB is server-only.** `lib/tmdb/server.ts` (`import "server-only"`) holds the API key; the only client-reachable endpoint is `app/api/tmdb/search/route.ts` for search-as-you-type.

**Title-id convention (`lib/titles.ts`).** `tmdb_movie_id` columns store films as positive TMDB movie ids and series as the *negative* TMDB tv id. Always go through `toTitleId`/`parseTitleId`/`isSeries`/`titleHref` rather than interpreting the sign yourself.

**Collection items.** A physical copy can appear in several collections — rows share an `item_group_id`. Box sets are multiple rows with `is_box` and a shared `box_group_id`/`box_name`, shown as one card. Barcodes map to titles in a `barcodes` table; unknown barcodes go to a pending-approval queue that admins review.

**i18n.** UI is Dutch-first (`nl`) with English (`en`). Strings live in `lib/i18n/nl.ts` and `lib/i18n/en.ts` (the `Dictionary` type is derived from `nl`, so add every key to both). Placeholders are `{0}`, `{1}` filled by `format()`. Server code resolves the locale with `getLocale()` (`lib/preferences.ts`: `fv_locale` cookie, else detected from Vercel country header + Accept-Language via `lib/locale-detect.ts`) and passes `getDictionary(locale)`; client components use `useT()` from `lib/i18n/locale-provider.tsx`. Some route segments are Dutch (`/gids`, `/nieuwsbrief`), as are some domain values (`Condition` = `"Nieuw" | "Gebruikt" | "Beschadigd"`, `editie`).

**Reel (in-app help, no AI).** `components/help/reel-assistant.tsx` answers from the fixed bilingual knowledge base `lib/help/faq.ts`, matched by `lib/help/match.ts` (stopwords, stemming, synonyms, one-typo tolerance). New feature, moved button, or a "can't yet" that became possible? Update `lib/help/faq.ts` too. Unanswered questions show in `/admin/feedback?tab=help` (`help_questions.sql`, anonymous, 90 days).

**Errors and limits.** Server errors are stored by `instrumentation.ts` (`onRequestError`) and browser errors by `components/error-reporter.tsx`, both through `lib/report-error.ts` into `app_errors` (shown on `/admin/status`). Expensive or external work (shelf scan, import matching, barcode suggestions) asks `withinLimit()` (`lib/rate-limit.ts`) first; add new heavy actions to `LIMITS` there.

**Types.** `types/database.ts` is hand-written (not generated) and mirrors the Postgres columns in snake_case; `types/tmdb.ts` holds TMDB DTOs. Keep them in sync with the SQL when adding columns.

**Images.** `next.config.ts` allows `image.tmdb.org` and the Supabase Storage public `covers` bucket (custom covers). It also sets security headers; `Permissions-Policy` must keep `camera=(self)` for the barcode scanner. No CSP on purpose.
