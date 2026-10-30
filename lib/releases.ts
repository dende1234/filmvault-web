import type { ReleaseDatesDto } from "@/types/tmdb";

/** Physical releases (TMDB type 5 = DVD/Blu-ray/4K) of one film in one
 * country, earliest first, as { date: YYYY-MM-DD, note } (note is often the
 * format, e.g. "4K Ultra HD"). Pure, so testable. */
export function physicalReleases(dates: ReleaseDatesDto | null | undefined, country: string): { date: string; note: string | null }[] {
  const here = dates?.results?.find((r) => r.iso_3166_1 === country);
  return (here?.release_dates ?? [])
    .filter((d) => d.type === 5 && d.release_date)
    .map((d) => ({ date: d.release_date!.slice(0, 10), note: d.note?.trim() || null }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** First physical release in [from, to] (inclusive, YYYY-MM-DD), or null. */
export function physicalReleaseBetween(dates: ReleaseDatesDto | null | undefined, country: string, from: string, to: string) {
  return physicalReleases(dates, country).find((r) => r.date >= from && r.date <= to) ?? null;
}

/** "2026-11" → first and last day. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}
