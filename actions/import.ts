"use server";

// User CSV import into a collection. Same rules as adding a film by hand:
// a barcode already on the master film list goes straight into the
// collection; an unknown barcode goes to the admin approval queue
// (pending_barcodes), boxes included. Rows without a barcode can't enter a
// collection (approval needs a barcode) but can still be logged as watched.
// Watched/rating go to the "Bekeken" module (film_logs); when an approved
// copy lands in the collection later, the DB trigger copies them onto it.

import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { getLocale } from "@/lib/preferences";
import { getTitleDetail, getTvDetail, searchMovies, searchTv } from "@/lib/tmdb/server";
import { parseTitleId } from "@/lib/titles";
import { normalizeBarcode } from "@/lib/barcode";
import { detailsColumns, type CopyDetailsInput } from "@/lib/copy-details";
import { purchaseColumns, type PurchaseInput } from "@/lib/purchase";
import { addBarcodesToCollections, addKnownBoxToCollections, addNewBoxAsPending, getBarcodesForMovie } from "@/actions/barcodes";
import { addViewing, setFilmRating } from "@/actions/watched";
import { addToWishlist } from "@/actions/wishlist";
import type { Barcode } from "@/types/database";
import type { MovieSummaryDto } from "@/types/tmdb";
import { withinLimit } from "@/lib/rate-limit";

const MAX_BATCH = 25;
const SEARCH_CONCURRENCY = 5;

export type ImportFilm = { tmdbId: number; title: string; poster: string | null; year: string | null };

/** What the master film list already knows about a barcode. */
export type KnownRelease = {
  films: ImportFilm[];
  type: string;
  editie: string;
  isBox: boolean;
  boxGroupId: string | null;
  boxName: string | null;
};

export type ImportRowMatch = {
  barcode: string | null;
  known: KnownRelease | null;
  candidates: ImportFilm[];
};

function toFilm(m: Pick<MovieSummaryDto, "id" | "title" | "poster_path" | "release_date">): ImportFilm {
  return { tmdbId: m.id, title: m.title, poster: m.poster_path, year: m.release_date?.slice(0, 4) || null };
}

/** Step 1 (per batch of ≤25 rows): resolve known barcodes via the master
 * film list, otherwise search TMDB by title (+ year preference). The client
 * calls this in batches so each server action stays short. */
export async function matchImportRows(
  rows: { title: string; year: string | null; barcode: string | null; kind?: "movie" | "tv" | null }[],
): Promise<ImportRowMatch[]> {
  await requireUserId();
  if (rows.length > MAX_BATCH) throw new Error("batch_too_large");
  if (!(await withinLimit("import_match"))) throw new Error("rate_limited");
  const supabase = await createClient();
  const locale = await getLocale();

  const codes = rows.map((r) => (r.barcode ? normalizeBarcode(r.barcode) : "") || null);
  const unique = Array.from(new Set(codes.filter((c): c is string => !!c)));
  const { data: barcodeRows } = unique.length
    ? await supabase.from("barcodes").select("*").in("barcode", unique)
    : { data: [] as Barcode[] };
  const byCode = new Map<string, Barcode[]>();
  for (const b of (barcodeRows ?? []) as Barcode[]) byCode.set(b.barcode, [...(byCode.get(b.barcode) ?? []), b]);

  const details = new Map<number, ImportFilm>();
  async function film(id: number) {
    if (!details.has(id)) {
      const d = await getTitleDetail(id, locale).catch(() => null);
      details.set(id, d ? toFilm(d) : { tmdbId: id, title: `TMDB #${id}`, poster: null, year: null });
    }
    return details.get(id)!;
  }

  const results: ImportRowMatch[] = new Array(rows.length);
  let next = 0;
  async function worker() {
    while (next < rows.length) {
      const i = next++;
      const code = codes[i];
      const knownRows = code ? byCode.get(code) : undefined;
      if (knownRows && knownRows.length > 0) {
        const films = await Promise.all(Array.from(new Set(knownRows.map((k) => k.tmdb_movie_id))).map(film));
        const first = knownRows[0];
        results[i] = {
          barcode: code,
          known: { films, type: first.type, editie: first.editie, isBox: first.is_box, boxGroupId: first.box_group_id, boxName: first.box_name },
          candidates: [],
        };
        continue;
      }
      const title = rows[i].title.trim();
      let candidates: ImportFilm[] = [];
      if (title) {
        const year = rows[i].year;
        const kind = rows[i].kind ?? null;
        const search = (fn: typeof searchMovies) => fn(title, 1, locale).then((p) => p.results ?? []).catch(() => []);
        // Known kind → search that; unknown → films first, series as fallback.
        let found = await search(kind === "tv" ? searchTv : searchMovies);
        if (!kind && found.length === 0) found = await search(searchTv);
        const ranked = year
          ? [...found].sort((a, b) => Number(b.release_date?.startsWith(year) ?? false) - Number(a.release_date?.startsWith(year) ?? false))
          : found;
        candidates = ranked.slice(0, 5).map(toFilm);
      }
      results[i] = { barcode: code, known: null, candidates };
    }
  }
  await Promise.all(Array.from({ length: SEARCH_CONCURRENCY }, worker));
  return results;
}

type Viewing = { watched: boolean; rating: number | null; watchedOn: string | null };

export type ImportItem =
  | ({
      kind: "single";
      ref: string;
      film: ImportFilm;
      barcode: string | null;
      type: string;
      editie: string;
      /** Series only: seasons in this release; completeSeries = all regular seasons. */
      seasons?: number[] | null;
      completeSeries?: boolean;
      /** Cut, languages and label from the spreadsheet. */
      details?: CopyDetailsInput | null;
      /** Price, date and shop: only stored on a copy that goes straight in. */
      purchase?: PurchaseInput | null;
      /** A Letterboxd watchlist row: goes to the wishlist, not a collection. */
      toWishlist?: boolean;
    } & Viewing)
  | {
      kind: "box";
      ref: string;
      barcode: string;
      boxName: string;
      type: string;
      editie: string;
      known: { boxGroupId: string; boxName: string | null } | null;
      films: (ImportFilm & Viewing)[];
    };

export type ImportStatus = "added" | "already" | "pending" | "watched_only" | "wishlist" | "skipped" | "error";
export type ImportResult = { ref: string; status: ImportStatus };

async function logViewing(film: ImportFilm, v: Viewing) {
  const meta = { tmdbMovieId: film.tmdbId, title: film.title, poster: film.poster };
  let ok = true;
  if (v.watched) ok = !(await addViewing(meta, v.watchedOn)).error && ok;
  if (v.rating != null) ok = !(await setFilmRating(meta, v.rating)).error && ok;
  return ok;
}

/** Already submitted by this user and still waiting? Then don't queue it again. */
async function alreadyPending(userId: string, barcode: string, tmdbId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pending_barcodes")
    .select("id")
    .eq("submitted_by", userId)
    .eq("barcode", barcode)
    .eq("tmdb_movie_id", tmdbId)
    .eq("status", "pending")
    .limit(1);
  return (data ?? []).length > 0;
}

/** Step 2 (per batch of ≤25 items): actually import into one collection.
 * collectionId may be null when nothing goes into a collection (e.g. a
 * Letterboxd export: only viewings and wishlist titles). */
export async function importBatch(collectionId: string | null, items: ImportItem[]): Promise<ImportResult[]> {
  const userId = await requireUserId();
  if (items.length > MAX_BATCH) throw new Error("batch_too_large");
  const supabase = await createClient();
  if (collectionId) {
    const { data: collection } = await supabase.from("collections").select("id").eq("id", collectionId).eq("user_id", userId).maybeSingle();
    if (!collection) throw new Error("collection_not_found");
  }
  const target = collectionId ? [collectionId] : [];
  // Only used on paths that need a collection; those are skipped when there is none.
  const cid = collectionId ?? "";

  const results: ImportResult[] = [];
  // Sequential on purpose: keeps per-row results ordered and avoids racing
  // two rows of the same film into duplicate collection items.
  for (const item of items) {
    try {
      if (item.kind === "single" && item.toWishlist) {
        try {
          await addToWishlist(item.film.tmdbId, item.film.title, item.film.poster);
          results.push({ ref: item.ref, status: "wishlist" });
        } catch (e) {
          // Unique (user, title): it was already on the wishlist.
          const code = (e as { code?: string })?.code;
          results.push({ ref: item.ref, status: code === "23505" ? "already" : "error" });
        }
        continue;
      }
      if (item.kind !== "single" && !collectionId) {
        results.push({ ref: item.ref, status: "error" });
        continue;
      }
      if (item.kind === "single") {
        const barcode = item.barcode && collectionId ? normalizeBarcode(item.barcode) : "";
        if (!barcode) {
          const hasViewing = item.watched || item.rating != null;
          const ok = hasViewing ? await logViewing(item.film, item) : true;
          results.push({ ref: item.ref, status: hasViewing ? (ok ? "watched_only" : "error") : "skipped" });
          continue;
        }
        const knownForFilm = (await getBarcodesForMovie(item.film.tmdbId)).some((b) => b.barcode.toLowerCase() === barcode.toLowerCase());
        let seasons = item.seasons ?? null;
        const { kind: titleKind, tmdbId: tvId } = parseTitleId(item.film.tmdbId);
        if (titleKind === "tv" && item.completeSeries) {
          const tv = await getTvDetail(tvId).catch(() => null);
          if (tv) seasons = tv.seasons.filter((s) => s.season_number > 0).map((s) => s.season_number);
        }
        if (titleKind !== "tv") seasons = null;
        let status: ImportStatus;
        if (!knownForFilm && (await alreadyPending(userId, barcode, item.film.tmdbId))) status = "pending";
        else {
          const unchanged = await addBarcodesToCollections(
            [],
            [{ barcode, type: item.type, editie: item.editie, ...(seasons?.length ? { seasons } : {}), details: item.details }],
            item.film.tmdbId,
            item.film.title,
            item.film.poster,
            target,
          );
          status = knownForFilm ? (unchanged.has(cid) ? "already" : "added") : "pending";
          // A known barcode went straight into the collection: put the details on that copy.
          // (A pending one carries them on pending_barcodes until approval.)
          // Purchase details have no place on pending_barcodes, so only here.
          // Two updates: purchase columns may not exist yet (purchase_details.sql)
          // and must not take the other details down with them.
          if (knownForFilm) {
            for (const cols of [detailsColumns(item.details), purchaseColumns(item.purchase)]) {
              if (Object.keys(cols).length === 0) continue;
              await supabase
                .from("collection_items")
                .update(cols)
                .eq("collection_id", cid)
                .eq("barcode", barcode)
                .eq("tmdb_movie_id", item.film.tmdbId);
            }
          }
        }
        await logViewing(item.film, item);
        results.push({ ref: item.ref, status });
      } else {
        const barcode = normalizeBarcode(item.barcode);
        const films = item.films.map((f) => ({ tmdb_movie_id: f.tmdbId, movie_title: f.title, movie_poster: f.poster }));
        let status: ImportStatus;
        if (item.known) {
          const unchanged = await addKnownBoxToCollections(films, item.known.boxGroupId, item.known.boxName, barcode, item.type, item.editie, target);
          status = unchanged.has(cid) ? "already" : "added";
        } else if (await alreadyPending(userId, barcode, item.films[0].tmdbId)) {
          status = "pending";
        } else {
          await addNewBoxAsPending(films, item.boxName, barcode, item.type, item.editie, target);
          status = "pending";
        }
        for (const f of item.films) await logViewing(f, f);
        results.push({ ref: item.ref, status });
      }
    } catch {
      results.push({ ref: item.ref, status: "error" });
    }
  }
  return results;
}
