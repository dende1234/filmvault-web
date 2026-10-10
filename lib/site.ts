/** Public site identity — one place for the brand name and canonical URL
 * (used by metadataBase, sitemap, robots and invite/share links). */
export const SITE_NAME = "Filmory";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.filmory.nl").replace(/\/$/, "");
