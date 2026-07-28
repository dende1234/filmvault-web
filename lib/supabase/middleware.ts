import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Redirects an unauthenticated visitor away from everything except these.
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/privacy"];
// Unlike login/register, these stay reachable regardless of auth state —
// no redirect either way (a logged-in user must still be able to read the
// privacy policy from their account, not get bounced back to /dashboard).
const ALWAYS_ACCESSIBLE_PATHS = ["/privacy"];

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
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isAlwaysAccessible = ALWAYS_ACCESSIBLE_PATHS.some((p) => path.startsWith(p));

  if (isAlwaysAccessible) return supabaseResponse;

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
