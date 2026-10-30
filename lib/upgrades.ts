/** Upgrade tips: titles you own only in a lower format while the master film
 * list knows a better release. Pure, so the rules are testable. */

/** 0 = unknown/other (VHS…), 1 = DVD, 2 = Blu-ray, 3 = 4K UHD. */
export function formatRank(type: string | null | undefined): number {
  const v = type ?? "";
  if (/4k|uhd|ultra\s*hd|2160/i.test(v)) return 3;
  if (/blu.?ray|\bbd\b/i.test(v)) return 2;
  if (/dvd/i.test(v)) return 1;
  return 0;
}

export type UpgradeTip = { tmdbId: number; title: string; poster: string | null; ownedType: string; betterType: string };

export function findUpgrades(
  owned: { tmdb_movie_id: number; type: string; movie_title: string; movie_poster: string | null }[],
  releases: { tmdb_movie_id: number; type: string }[],
): UpgradeTip[] {
  // Your best copy per title.
  const best = new Map<number, (typeof owned)[number]>();
  for (const c of owned) {
    const cur = best.get(c.tmdb_movie_id);
    if (!cur || formatRank(c.type) > formatRank(cur.type)) best.set(c.tmdb_movie_id, c);
  }
  // The best known release per title.
  const top = new Map<number, string>();
  for (const r of releases) {
    const cur = top.get(r.tmdb_movie_id);
    if (!cur || formatRank(r.type) > formatRank(cur)) top.set(r.tmdb_movie_id, r.type);
  }
  const tips: UpgradeTip[] = [];
  for (const [id, copy] of best) {
    const better = top.get(id);
    const have = formatRank(copy.type);
    if (better && have > 0 && formatRank(better) > have) {
      tips.push({ tmdbId: id, title: copy.movie_title, poster: copy.movie_poster, ownedType: copy.type, betterType: better });
    }
  }
  // Biggest jump first (DVD → 4K before DVD → Blu-ray), then by title.
  return tips.sort((a, b) => formatRank(b.betterType) - formatRank(b.ownedType) - (formatRank(a.betterType) - formatRank(a.ownedType)) || a.title.localeCompare(b.title));
}
