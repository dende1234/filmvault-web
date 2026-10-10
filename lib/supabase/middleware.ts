import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Redirects an unauthenticated visitor away from everything except these.
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/privacy"];
// Unlike login/register, these stay reachable regardless of auth state —
// no redirect either way (a logged-in user must still be able to read the
// privacy policy from their account, not get bounced back to /dashboard).
const ALWAYS_ACCESSIBLE_PATHS = ["/privacy", "/gids", "/c/"];

// First-party acquisition source, kept 30 days and recorded once on signup
// (actions/profile.ts). Not a tracking cookie: it holds only a campaign
// label such as "invite-1a2b3c4d" or "facebook", never an identifier.
const SOURCE_COOKIE = "fv_src";
const SOURCE_MAX_AGE = 60 * 60 * 24 * 30;

function sourceFrom(request: NextRequest): string | null {
  const raw = request.nextUrl.searchParams.get("ref") ?? request.nextUrl.searchParams.get("utm_source");
  if (!raw) return null;
  const clean = raw.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64);
  return clean || null;
}

/** Refreshes the Supabase session on every request and gates authenticated
 * routes — the web equivalent of `FilmVaultApp.kt`'s sessionStatus switch
 * (Splash/Auth/Main), except there's no splash state on web (SSR resolves
 * the session before the response is sent). */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // "/" is the public landing page — exact match only, since every path
  // starts with "/" (a prefix match would make the whole app public).
  const isPublicPath = path === "/" || PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isAlwaysAccessible = ALWAYS_ACCESSIBLE_PATHS.some((p) => path.startsWith(p));

  // Remember where an anonymous visitor came from (first touch wins).
  const source = !user && !request.cookies.get(SOURCE_COOKIE) ? sourceFrom(request) : null;
  const withSource = (response: NextResponse) => {
    if (source) {
      response.cookies.set(SOURCE_COOKIE, source, { maxAge: SOURCE_MAX_AGE, httpOnly: true, sameSite: "lax", path: "/" });
    }
    return response;
  };

  if (isAlwaysAccessible) return withSource(supabaseResponse);

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return withSource(NextResponse.redirect(url));
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return withSource(supabaseResponse);
}
