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

/** Cut, languages and label for one copy, as sent from the client. */
export type CopyDetailsInput = {
  cut?: string | null;
  label?: string | null;
  audioLanguages?: string[] | null;
  subtitleLanguages?: string[] | null;
};

/** Only the details that are set, as collection_items / pending_barcodes
 * columns — so nothing is sent (or overwritten) when a field is empty. */
export function detailsColumns(d: CopyDetailsInput | null | undefined): Record<string, unknown> {
  if (!d) return {};
  const out: Record<string, unknown> = {};
  const cut = d.cut?.trim().slice(0, 60);
  const label = d.label?.trim().slice(0, 80);
  const audio = cleanLanguages(d.audioLanguages)?.slice(0, 20);
  const subs = cleanLanguages(d.subtitleLanguages)?.slice(0, 40);
  if (cut) out.cut = cut;
  if (label) out.label = label;
  if (audio) out.audio_languages = audio;
  if (subs) out.subtitle_languages = subs;
  return out;
}

const CUT_PATTERNS: [RegExp, string][] = [
  [/director'?s?\s*cut|regisseursversie|director'?s\s*edition/i, "Director's Cut"],
  [/final\s*cut/i, "Final Cut"],
  [/extended|verlengde|langfassung/i, "Extended"],
  [/unrated|uncut|ungeschnitten|ongecensureerd/i, "Unrated"],
  [/theatrical|kinoversion|kinofassung|bioscoopversie|cinema\s*(cut|version)/i, "Theatrical"],
  [/\btv[\s-]*(cut|versie|version|fassung)/i, "TV-versie"],
];

/** A known cut mentioned anywhere in a text, e.g. an edition cell like
 * "Der Herr der Ringe - Kinoversion" or "Extended Edition (UK)". */
export function extractCut(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const [re, cut] of CUT_PATTERNS) if (re.test(text)) return cut;
  return null;
}

/** A cut cell: a known cut, else the text itself (shortened). */
export function normalizeCut(text: string | null | undefined): string | null {
  const v = text?.trim();
  if (!v) return null;
  return extractCut(v) ?? v.slice(0, 60);
}

/** A known label mentioned in a text ("Criterion Collection" → "Criterion"). */
export function extractLabel(text: string | null | undefined): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  return LABELS.find((l) => lower.includes(l.toLowerCase().replace(/!$/, ""))) ?? null;
}

let nameToCode: Map<string, string> | null = null;
function languageLookup(): Map<string, string> {
  if (nameToCode) return nameToCode;
  nameToCode = new Map();
  for (const code of LANGUAGES) {
    nameToCode.set(code, code);
    for (const locale of ["nl", "en", "de", "fr", "es"]) {
      const name = languageName(code, locale).toLowerCase();
      if (name && name !== code) nameToCode.set(name, code);
    }
  }
  // Common short forms in spreadsheets.
  for (const [alias, code] of [["eng", "en"], ["ger", "de"], ["deu", "de"], ["fre", "fr"], ["fra", "fr"], ["spa", "es"], ["ita", "it"], ["jap", "ja"], ["jpn", "ja"], ["ned", "nl"], ["nld", "nl"], ["dut", "nl"], ["vlaams", "nl"]] as const) {
    nameToCode.set(alias, code);
  }
  return nameToCode;
}

/** Free text with languages ("EN, ES", "Engels / Duits", "English + German")
 * → ISO 639-1 codes. Unknown words are skipped. */
export function parseLanguages(text: string | null | undefined): string[] | null {
  if (!text?.trim()) return null;
  const lookup = languageLookup();
  const codes = text
    .split(/[,;/|+&]|\s+(?:en|and|und|et|y)\s+/i)
    .map((part) => part.trim().toLowerCase().replace(/[^\p{L}\s-]/gu, "").trim())
    .map((part) => lookup.get(part) ?? lookup.get(part.split(/\s+/)[0]) ?? null)
    .filter((c): c is string => !!c);
  return cleanLanguages(codes);
}
