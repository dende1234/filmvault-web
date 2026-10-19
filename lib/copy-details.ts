/** Shared choices for "Details van dit exemplaar" (copy_details.sql). */

/** Common cuts. Anything else is typed as free text ("Anders"). */
export const CUTS = ["Theatrical", "Extended", "Director's Cut", "Unrated", "Final Cut", "TV-versie"] as const;

/** Suggestions only; any label can be typed. */
export const LABELS = [
  "Criterion",
  "Arrow Video",
  "Second Sight",
  "Eureka!",
  "88 Films",
  "Vinegar Syndrome",
  "Shout! Factory",
  "Kino Lorber",
  "Indicator",
  "Radiance",
  "Studiocanal",
  "Manta Lab",
  "Mondo",
  "Turbine Medien",
  "Imprint",
];

/** ISO 639-1 codes offered in the language pickers; names come from
 * Intl.DisplayNames in the viewer's language. */
export const LANGUAGES = [
  "nl", "en", "de", "fr", "es", "it", "pt", "ja", "ko", "zh", "sv", "da", "no", "fi",
  "pl", "cs", "hu", "tr", "ru", "el", "ar", "he", "hi", "th", "uk", "ca",
] as const;

export function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function cleanLanguages(codes: string[] | null | undefined): string[] | null {
  const clean = Array.from(new Set((codes ?? []).map((c) => c.trim().toLowerCase()).filter((c) => /^[a-z]{2,3}$/.test(c))));
  return clean.length > 0 ? clean : null;
}
