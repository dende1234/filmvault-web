import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_vercel|favicon.ico|icon|apple-icon|pwa-icon|manifest.webmanifest|opengraph-image|robots.txt|sitemap.xml|api/tmdb|api/cron|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
