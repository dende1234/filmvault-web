import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only the public marketing pages are meant for search engines: the landing
// page, the guides, registration and privacy. Everything else needs a
// session anyway. Shared collections (/c/…) are reachable by link but kept
// out of search results on purpose (privacy), also via their noindex meta.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/$", "/gids", "/register", "/privacy"],
      disallow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
