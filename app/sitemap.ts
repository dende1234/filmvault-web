import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/gids`, changeFrequency: "monthly", priority: 0.8 },
    ...GUIDES.map((g) => ({
      url: `${SITE_URL}/gids/${g.slug}`,
      lastModified: new Date(g.updated),
      changeFrequency: "monthly" as const,
      priority: 0.7,
      ...(g.alternate
        ? { alternates: { languages: { [g.lang]: `${SITE_URL}/gids/${g.slug}`, [g.lang === "nl" ? "en" : "nl"]: `${SITE_URL}/gids/${g.alternate}` } } }
        : {}),
    })),
    { url: `${SITE_URL}/register`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
