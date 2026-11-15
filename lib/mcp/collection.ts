/** What the MCP tools do with a member's copies. Pure, so testable; the
 * server (lib/mcp/server.ts) loads the rows. */

import { matchesFormat } from "@/lib/formats";

export type McpCopy = {
  item_group_id: string;
  collection_id: string;
  tmdb_movie_id: number;
  movie_title: string;
  barcode: string | null;
  type: string;
  editie: string;
  watched: boolean | null;
  rating: number | null;
  loaned_to: string | null;
  loaned_at: string | null;
  shelf_location?: string | null;
  purchase_price?: number | null;
  is_box: boolean | null;
  box_name: string | null;
  seasons?: number[] | null;
};

export type CopySummary = {
  /** TMDB title id (negative = series, lib/titles.ts). */
  titleId: number;
  title: string;
  kind: "film" | "series";
  format: string;
  edition: string;
  barcode: string | null;
  location: string | null;
  watched: boolean;
  rating: number | null;
  loanedTo: string | null;
  box: string | null;
  collections: string[];
};

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** One entry per physical copy (rows share item_group_id across collections). */
export function summarizeCopies(rows: McpCopy[], collectionNames: Map<string, string>): CopySummary[] {
  const groups = new Map<string, McpCopy[]>();
  for (const r of rows) groups.set(r.item_group_id, [...(groups.get(r.item_group_id) ?? []), r]);
  return [...groups.values()].map((g) => {
    const r = g[0];
    return {
      titleId: r.tmdb_movie_id,
      title: r.movie_title,
      kind: r.tmdb_movie_id < 0 ? "series" : "film",
      format: r.type,
      edition: r.editie,
      barcode: r.barcode || null,
      location: r.shelf_location ?? null,
      watched: !!r.watched,
      rating: r.rating,
      loanedTo: r.loaned_to,
      box: r.is_box ? r.box_name : null,
      collections: [...new Set(g.map((x) => collectionNames.get(x.collection_id) ?? "?"))],
    };
  });
}

export type CopyFilter = { query?: string; format?: string; location?: string; watched?: boolean; loaned?: boolean };

export function filterCopies(copies: CopySummary[], f: CopyFilter): CopySummary[] {
  const q = f.query ? fold(f.query) : "";
  const loc = f.location ? fold(f.location) : "";
  return copies.filter(
    (c) =>
      (!q || fold(c.title).includes(q) || (c.box ? fold(c.box).includes(q) : false)) &&
      (!f.format || matchesFormat(c.format, f.format) || fold(c.format).includes(fold(f.format))) &&
      (!loc || fold(c.location ?? "").includes(loc)) &&
      (f.watched === undefined || c.watched === f.watched) &&
      (f.loaned === undefined || !!c.loanedTo === f.loaned),
  );
}

export type Verdict =
  | { status: "owned"; copies: CopySummary[] }
  | { status: "other_edition"; copies: CopySummary[] }
  | { status: "on_wishlist"; title: string; holyGrail: boolean }
  | { status: "not_owned" };

/** Shop mode's answer: by barcode (exact release); a barcode the film list
 * knows gives the title id, else the title text is compared. */
export function ownershipVerdict(
  copies: CopySummary[],
  wishlist: { tmdb_movie_id: number; movie_title: string; is_grail?: boolean | null }[],
  input: { barcode?: string; title?: string; barcodeTitleId?: number | null },
): Verdict {
  if (input.barcode) {
    const exact = copies.filter((c) => c.barcode === input.barcode);
    if (exact.length) return { status: "owned", copies: exact };
  }
  const t = input.title ? fold(input.title) : "";
  const sameTitle = (id: number, title: string) => (input.barcodeTitleId ? id === input.barcodeTitleId : !!t && fold(title) === t);
  const same = copies.filter((c) => sameTitle(c.titleId, c.title));
  if (same.length) return { status: input.barcode ? "other_edition" : "owned", copies: same };
  const wish = wishlist.find((w) => sameTitle(w.tmdb_movie_id, w.movie_title));
  if (wish) return { status: "on_wishlist", title: wish.movie_title, holyGrail: !!wish.is_grail };
  return { status: "not_owned" };
}

export function collectionStats(copies: CopySummary[], rows: McpCopy[], collections: number) {
  const byFormat: Record<string, number> = {};
  for (const c of copies) byFormat[c.format] = (byFormat[c.format] ?? 0) + 1;
  // Purchase price is per copy: count each item_group_id once.
  const seen = new Set<string>();
  let value = 0;
  for (const r of rows) {
    if (seen.has(r.item_group_id)) continue;
    seen.add(r.item_group_id);
    value += Number(r.purchase_price ?? 0) || 0;
  }
  return {
    copies: copies.length,
    films: copies.filter((c) => c.kind === "film").length,
    series: copies.filter((c) => c.kind === "series").length,
    watched: copies.filter((c) => c.watched).length,
    unwatched: copies.filter((c) => !c.watched).length,
    loanedOut: copies.filter((c) => c.loanedTo).length,
    collections,
    byFormat,
    totalPurchaseValue: Math.round(value * 100) / 100,
  };
}
