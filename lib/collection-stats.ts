/** Numbers for /statistieken, from your copies. Pure, so testable. Each
 * physical copy (item_group_id) counts once; a box counts per film. */

export type StatsRow = {
  item_group_id: string;
  movie_title: string;
  type: string | null;
  editie: string | null;
  label?: string | null;
  region?: string | null;
  watched: boolean | null;
  added_at: string | null;
  purchase_price?: number | null;
  purchase_shop?: string | null;
  tmdb_movie_id: number;
};

export type Count = { key: string; count: number };

export type CollectionStats = {
  copies: number;
  titles: number;
  series: number;
  watched: number;
  byFormat: Count[];
  byEdition: Count[];
  byLabel: Count[];
  byShop: Count[];
  value: { total: number; priced: number; average: number | null; top: { title: string; price: number }[] };
  /** Copies added per month, last `months` months, oldest first ("2026-10"). */
  perMonth: Count[];
};

function tally(values: (string | null | undefined)[], limit = 8): Count[] {
  const m = new Map<string, number>();
  for (const v of values) {
    const k = v?.trim();
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return Array.from(m, ([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function collectionStats(rows: StatsRow[], now = new Date(), months = 12): CollectionStats {
  const seen = new Set<string>();
  const copies = rows.filter((r) => (seen.has(r.item_group_id) ? false : (seen.add(r.item_group_id), true)));
  const priced = copies.filter((c) => c.purchase_price != null).map((c) => ({ title: c.movie_title, price: Number(c.purchase_price) }));
  const total = Math.round(priced.reduce((s, p) => s + p.price, 0) * 100) / 100;

  const perMonth: Count[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    perMonth.push({ key: d.toISOString().slice(0, 7), count: 0 });
  }
  const idx = new Map(perMonth.map((p, i) => [p.key, i]));
  for (const c of copies) {
    const i = c.added_at ? idx.get(c.added_at.slice(0, 7)) : undefined;
    if (i !== undefined) perMonth[i].count++;
  }

  return {
    copies: copies.length,
    titles: new Set(copies.map((c) => c.tmdb_movie_id)).size,
    series: new Set(copies.filter((c) => c.tmdb_movie_id < 0).map((c) => c.tmdb_movie_id)).size,
    watched: copies.filter((c) => c.watched).length,
    byFormat: tally(copies.map((c) => c.type)),
    byEdition: tally(copies.map((c) => c.editie)),
    byLabel: tally(copies.map((c) => c.label)),
    byShop: tally(copies.map((c) => c.purchase_shop)),
    value: {
      total,
      priced: priced.length,
      average: priced.length ? Math.round((total / priced.length) * 100) / 100 : null,
      top: priced.sort((a, b) => b.price - a.price).slice(0, 5),
    },
    perMonth,
  };
}
