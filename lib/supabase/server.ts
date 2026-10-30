import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server-side Supabase client for Server Components/Actions/Route Handlers —
 * reads/writes the session via Next.js cookies, same session `@supabase/ssr`
 * proxy keeps refreshed. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component (no cookie write access) — safe to
            // ignore since proxy.ts refreshes the session on every request.
          }
        },
      },
    },
  );
}
