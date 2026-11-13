/** The yearly recap ("Filmory Wrapped"), from data already stored. Pure, so
 * the page (components/yearly-recap-client.tsx) and the share image
 * (app/api/recap/image) compute the same numbers. "alreadyWatched" = of the
 * films added that year, how many are marked watched now (there's no
 * watched-at date), as in YearlyRecapViewModel.kt. */

type RecapItem = {
  added_at: string | null;
  rating: number | null;
  watched: boolean | null;
  type: string;
  is_favorite?: boolean | null;
  movie_poster: string | null;
};

export function yearOf(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const year = Number.parseInt(isoDate.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

function monthOf(isoDate: string | null): number | null {
  if (!isoDate || isoDate.length < 7) return null;
  const month = Number.parseInt(isoDate.slice(5, 7), 10);
  return Number.isNaN(month) ? null : month;
}

function top<K>(counts: Map<K, number>): K | null {
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function computeRecap<T extends RecapItem>(
  items: T[],
  collections: { created_at: string | null }[],
  badges: { earned_at: string | null }[],
  year: number,
) {
  const itemsThatYear = items.filter((i) => yearOf(i.added_at) === year);
  const ratings = itemsThatYear.map((i) => i.rating).filter((r): r is number => r !== null);

  const typeCounts = new Map<string, number>();
  itemsThatYear.forEach((i) => typeCounts.set(i.type, (typeCounts.get(i.type) ?? 0) + 1));
  const monthCounts = new Map<number, number>();
  itemsThatYear.forEach((i) => {
    const m = monthOf(i.added_at);
    if (m) monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1);
  });

  // For the share image: favourites first, then the best rated, then the newest.
  const highlights = [...itemsThatYear]
    .filter((i) => i.movie_poster)
    .sort(
      (a, b) =>
        Number(!!b.is_favorite) - Number(!!a.is_favorite) ||
        (b.rating ?? -1) - (a.rating ?? -1) ||
        (b.added_at ?? "").localeCompare(a.added_at ?? ""),
    )
    .map((i) => i.movie_poster as string)
    .filter((p, i, all) => all.indexOf(p) === i);

  return {
    itemsThatYear: [...itemsThatYear].sort((a, b) => (a.added_at ?? "").localeCompare(b.added_at ?? "")),
    filmsAdded: itemsThatYear.length,
    alreadyWatched: itemsThatYear.filter((i) => i.watched).length,
    averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    topType: top(typeCounts),
    busiestMonth: top(monthCounts),
    newCollections: collections.filter((c) => yearOf(c.created_at) === year).length,
    badgesEarned: badges.filter((b) => yearOf(b.earned_at) === year).length,
    totalOwned: items.length,
    highlights,
  };
}
