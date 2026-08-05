import type { MetadataRoute } from "next";

// FilmVault is a private collection tracker, not a marketing site — almost
// everything requires a session (lib/supabase/middleware.ts redirects
// unauthenticated visitors to /login for anything except /login, /register,
// /forgot-password, /privacy), so there's nothing meaningful for a search
// engine to index. Blocking crawl entirely (except /privacy, which is
// genuinely public) is a more appropriate default than a sitemap aimed at
// getting indexed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
      allow: "/privacy",
    },
  };
}
