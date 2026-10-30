/** Compare two collections by title (tmdb_movie_id), each title once. Pure. */

export type CompareTitle = { tmdbId: number; title: string; poster: string | null };

export type Comparison = {
  onlyThem: CompareTitle[];
  onlyMe: CompareTitle[];
  both: CompareTitle[];
  /** On your wishlist and in their collection: borrow it, or ask where they got it. */
  wishTheyHave: CompareTitle[];
};

type Row = { tmdb_movie_id: number; movie_title: string; movie_poster: string | null };

function byTitle(rows: Row[]): Map<number, CompareTitle> {
  const m = new Map<number, CompareTitle>();
  for (const r of rows) if (!m.has(r.tmdb_movie_id)) m.set(r.tmdb_movie_id, { tmdbId: r.tmdb_movie_id, title: r.movie_title, poster: r.movie_poster });
  return m;
}

const sorted = (list: CompareTitle[]) => list.sort((a, b) => a.title.localeCompare(b.title, "nl"));

export function compareCollections(mine: Row[], theirs: Row[], myWishlist: { tmdb_movie_id: number }[]): Comparison {
  const me = byTitle(mine);
  const them = byTitle(theirs);
  const wished = new Set(myWishlist.map((w) => w.tmdb_movie_id));
  return {
    onlyThem: sorted([...them.values()].filter((t) => !me.has(t.tmdbId))),
    onlyMe: sorted([...me.values()].filter((t) => !them.has(t.tmdbId))),
    both: sorted([...me.values()].filter((t) => them.has(t.tmdbId))),
    wishTheyHave: sorted([...them.values()].filter((t) => wished.has(t.tmdbId) && !me.has(t.tmdbId))),
  };
}
