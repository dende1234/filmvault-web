# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev     # dev server on http://localhost:3000
npm run build   # production build (also the type check, since there is no separate tsc script)
npm run lint    # eslint (next core-web-vitals + typescript config)
```

There is no test suite. CI (`.github/workflows/ci.yml`, Node 22) runs `npm ci`, `npm run lint` and `npm run build` with dummy env values, so a change is "green" when lint and build both pass.

Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `TMDB_API_KEY` (required to build/run); optional: `NEXT_PUBLIC_SITE_URL`, `BREVO_API_KEY`/`BREVO_LIST_ID`/`BREVO_DOI_TEMPLATE_ID` (newsletter), `FEEDBACK_SALT` (IP hashing), `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `ANTHROPIC_API_KEY` (admin shelf scan, `lib/ai/shelf-scan.ts`; runtime only).

## Stack

Next.js 16 (App Router) + React 19, Supabase (`@supabase/ssr`) for auth and data, TMDB for film/series metadata, Tailwind v4 + Radix/shadcn-style primitives in `components/ui/`, `sonner` toasts, `@zxing` for camera barcode scanning. Path alias `@/*` maps to the repo root. Deployed on Vercel.

## Architecture

**Port of an Android app.** This is the web version of the FilmVault Android app (Kotlin). Many comments reference Kotlin files (`CollectionRepository.kt`, ViewModels, `strings.xml`) — table/column names and business logic are deliberately kept 1:1 with Android, so don't "improve" schemas or naming in isolation. The database schema and migrations live in the Android repo (`FilmVault/supabase/sql/*.sql`); comments cite which migration a column or RLS policy comes from (e.g. `series_support.sql`, `custom_covers.sql`). Optional columns from newer migrations are typed `?:` and code avoids sending them when unused so older databases keep working.

**Data access = Server Actions in `actions/`.** Each `actions/*.ts` file is `"use server"` and talks to Supabase via `createClient()` from `lib/supabase/server.ts`, then calls `revalidatePath`. Pages in `app/` are Server Components that call these actions directly and hand the data to a `*-client.tsx` component in `components/` for interactivity. A `"use server"` file may only export async functions — shared classes/types/constants go in plain modules (e.g. error classes in `lib/errors.ts`).

**Authorization relies on Supabase RLS.** Reads of other users' data (friends' collections, public collections) trust RLS policies rather than checking in app code. Admin-only pages and mutating admin actions both call `requireAdmin()` (`lib/require-admin.ts`) — keep that double check when adding admin features.

**Auth gating in `middleware.ts` → `lib/supabase/middleware.ts`.** Refreshes the Supabase session on every request and redirects: unauthenticated users to `/login`, authenticated users away from `/login`/`/register` to `/dashboard`. `PUBLIC_PATHS` and `ALWAYS_ACCESSIBLE_PATHS` there control which routes are public (`/`, `/c/[id]` public collections, `/gids` guides, `/privacy`, `/feedback`, `/nieuwsbrief`). It also sets the `fv_src` acquisition cookie and syncs the `fv_locale` cookie from `profiles.language`. Route groups: `app/(app)/` is the logged-in shell (`NavShell`, profile loaded in its layout), `app/(auth)/` is login/register.

**TMDB is server-only.** `lib/tmdb/server.ts` (`import "server-only"`) holds the API key; the only client-reachable endpoint is `app/api/tmdb/search/route.ts` for search-as-you-type.

**Title-id convention (`lib/titles.ts`).** `tmdb_movie_id` columns store films as positive TMDB movie ids and series as the *negative* TMDB tv id. Always go through `toTitleId`/`parseTitleId`/`isSeries`/`titleHref` rather than interpreting the sign yourself.

**Collection items.** A physical copy can appear in several collections — rows share an `item_group_id`. Box sets are multiple rows with `is_box` and a shared `box_group_id`/`box_name`, shown as one card. Barcodes map to titles in a `barcodes` table; unknown barcodes go to a pending-approval queue that admins review.

**i18n.** UI is Dutch-first (`nl`) with English (`en`). Strings live in `lib/i18n/nl.ts` and `lib/i18n/en.ts` (the `Dictionary` type is derived from `nl`, so add every key to both). Placeholders are `{0}`, `{1}` filled by `format()`. Server code resolves the locale with `getLocale()` (`lib/preferences.ts`: `fv_locale` cookie, else detected from Vercel country header + Accept-Language via `lib/locale-detect.ts`) and passes `getDictionary(locale)`; client components use `useT()` from `lib/i18n/locale-provider.tsx`. Some route segments are Dutch (`/gids`, `/nieuwsbrief`), as are some domain values (`Condition` = `"Nieuw" | "Gebruikt" | "Beschadigd"`, `editie`).

**Reel (in-app help, no AI).** `components/help/reel-assistant.tsx` answers from the fixed bilingual knowledge base `lib/help/faq.ts`, matched by `lib/help/match.ts` (stopwords, stemming, synonyms, one-typo tolerance). New feature, moved button, or a "can't yet" that became possible? Update `lib/help/faq.ts` too. Unanswered questions show in `/admin/feedback?tab=help` (`help_questions.sql`, anonymous, 90 days).

**Types.** `types/database.ts` is hand-written (not generated) and mirrors the Postgres columns in snake_case; `types/tmdb.ts` holds TMDB DTOs. Keep them in sync with the SQL when adding columns.

**Images.** `next.config.ts` allows `image.tmdb.org` and the Supabase Storage public `covers` bucket (custom covers). It also sets security headers; `Permissions-Policy` must keep `camera=(self)` for the barcode scanner. No CSP on purpose.
