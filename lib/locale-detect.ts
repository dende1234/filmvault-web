import type { Locale } from "@/lib/i18n/dictionary";

/** Dutch-speaking countries/territories (Vercel's x-vercel-ip-country codes). */
const DUTCH_COUNTRIES = new Set(["NL", "BE", "SR", "AW", "CW", "SX", "BQ"]);

/** Search engines and link-preview fetchers always get Dutch: the audience is
 * NL/Vlaanderen, and Google mostly crawls from the US — without this the
 * English page would be indexed and shared previews would turn English. */
const BOT_PATTERN =
  /bot\b|crawler|spider|crawling|googlebot|bingbot|duckduckbot|baiduspider|yandex|slurp|facebookexternalhit|facebot|whatsapp|telegrambot|twitterbot|linkedinbot|applebot|discordbot|slackbot|embedly|pinterest/i;

/** "nl-NL,nl;q=0.9,en;q=0.8" → [{ lang: "nl", q: 1 }, { lang: "nl", q: 0.9 }, …] sorted by q. */
export function parseAcceptLanguage(header: string | null | undefined): { lang: string; q: number }[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split("-")[0], q: Number.isFinite(q) ? q : 0 };
    })
    .filter((l) => l.lang && l.lang !== "*" && l.q > 0)
    .sort((a, b) => b.q - a.q);
}

/** Picks the UI language for a visitor who hasn't chosen one (no fv_locale
 * cookie). Pure — no I/O — so the rules are easy to test:
 *  - bots → nl
 *  - Dutch-speaking country → nl, unless the browser has no Dutch at all and
 *    prefers French or German (e.g. a French-speaking Belgian) → en.
 *    An English browser in NL stays Dutch: that's very common there.
 *  - other country → en, unless the browser prefers Dutch (a Dutch person
 *    abroad: nl first, or nl with q ≥ 0.5) → nl.
 *  - unknown country → browser language if it says nl/other, else nl.
 */
export function detectLocale({
  country,
  acceptLanguage,
  userAgent,
}: {
  country?: string | null;
  acceptLanguage?: string | null;
  userAgent?: string | null;
}): Locale {
  if (userAgent && BOT_PATTERN.test(userAgent)) return "nl";

  const langs = parseAcceptLanguage(acceptLanguage);
  const primary = langs[0]?.lang;
  const dutch = langs.find((l) => l.lang === "nl");
  const prefersDutch = primary === "nl" || (dutch !== undefined && dutch.q >= 0.5);
  const code = country?.trim().toUpperCase() || null;

  if (code && DUTCH_COUNTRIES.has(code)) {
    if (!dutch && (primary === "fr" || primary === "de")) return "en";
    return "nl";
  }
  if (code) return prefersDutch ? "nl" : "en";

  // Country unknown (local dev, or header missing).
  if (dutch) return "nl";
  if (primary) return "en";
  return "nl";
}
