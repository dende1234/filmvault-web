"use server";

// "Bekeken" module: one film_logs row per user per film (watched, rating,
// private review) plus a viewing diary (film_viewings). Triggers in
// watched_films.sql mirror watched/rating onto every collection copy of the
// film, so the collection, this module and the Android app stay in sync.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPost } from "@/actions/posts";
import type { DiaryEntry, FilmLog, FilmMeta, FilmViewing, WatchedFilmItem } from "@/types/database";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  return user.id;
}

function revalidateFilm(tmdbMovieId: number) {
  revalidatePath("/watched");
  revalidatePath(`/films/${tmdbMovieId}`);
  revalidatePath("/collections", "layout");
  revalidatePath("/dashboard");
}

function cleanRating(rating: number | null) {
  if (rating == null || !Number.isFinite(rating) || rating <= 0) return null;
  return Math.min(5, Math.max(0.5, Math.round(rating * 2) / 2));
}

function cleanDate(date: string | null) {
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function cleanReview(review: string | null) {
  const trimmed = review?.trim() ?? "";
  return trimmed ? trimmed.slice(0, 10000) : null;
}

/** Insert-or-update the film log, keeping title/poster fresh. */
async function upsertLog(userId: string, meta: FilmMeta, patch: Partial<Pick<FilmLog, "watched" | "rating" | "review" | "review_post_id">>) {
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("film_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("tmdb_movie_id", meta.tmdbMovieId)
    .maybeSingle();
  if (readError) throw readError;

  if (existing) {
    const { data, error } = await supabase
      .from("film_logs")
      .update({ ...patch, movie_title: meta.title, movie_poster: meta.poster, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as FilmLog;
  }
  const { data, error } = await supabase
    .from("film_logs")
    .insert({ user_id: userId, tmdb_movie_id: meta.tmdbMovieId, movie_title: meta.title, movie_poster: meta.poster, ...patch })
    .select("*")
    .single();
  if (error) throw error;
  return data as FilmLog;
}

/** Shares the review once as a feed post (visible to followers). Needs
 * review text — same rule as a normal feed post. */
async function shareReview(userId: string, log: FilmLog) {
  if (log.review_post_id || !log.review) return log;
  const post = await createPost(null, log.review, log.tmdb_movie_id, log.movie_title, log.movie_poster, log.rating);
  return upsertLog(userId, { tmdbMovieId: log.tmdb_movie_id, title: log.movie_title, poster: log.movie_poster }, { review_post_id: post.id });
}

/** The film log + diary for one film. Null log when not logged (or when the
 * watched_films.sql migration hasn't run yet — pages must keep working). */
export async function getFilmLog(tmdbMovieId: number): Promise<{ log: FilmLog | null; viewings: FilmViewing[] }> {
  try {
    const supabase = await createClient();
    const userId = await requireUserId();
    const [logRes, viewingsRes] = await Promise.all([
      supabase.from("film_logs").select("*").eq("user_id", userId).eq("tmdb_movie_id", tmdbMovieId).maybeSingle(),
      supabase.from("film_viewings").select("*").eq("user_id", userId).eq("tmdb_movie_id", tmdbMovieId),
    ]);
    if (logRes.error || viewingsRes.error) return { log: null, viewings: [] };
    const viewings = (viewingsRes.data as FilmViewing[]).sort(byDateDesc);
    return { log: (logRes.data as FilmLog | null) ?? null, viewings };
  } catch {
    return { log: null, viewings: [] };
  }
}

function byDateDesc(a: FilmViewing, b: FilmViewing) {
  // Dated viewings newest first; undated ones last.
  if (a.watched_on && b.watched_on) return b.watched_on.localeCompare(a.watched_on) || b.created_at.localeCompare(a.created_at);
  if (a.watched_on) return -1;
  if (b.watched_on) return 1;
  return b.created_at.localeCompare(a.created_at);
}

/** Everything for the /watched page in one go. `available` is false until
 * the migration has run. */
export async function getWatchedOverview(): Promise<{ available: boolean; films: WatchedFilmItem[]; diary: DiaryEntry[] }> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const [logsRes, viewingsRes, collectionsRes] = await Promise.all([
    supabase.from("film_logs").select("*").eq("user_id", userId),
    supabase.from("film_viewings").select("*").eq("user_id", userId),
    supabase.from("collections").select("id").eq("user_id", userId),
  ]);
  if (logsRes.error || viewingsRes.error) return { available: false, films: [], diary: [] };

  const logs = logsRes.data as FilmLog[];
  const viewings = (viewingsRes.data as FilmViewing[]).sort(byDateDesc);
  const collectionIds = (collectionsRes.data ?? []).map((c) => c.id as string);
  const owned = new Set<number>();
  if (collectionIds.length > 0) {
    const { data } = await supabase.from("collection_items").select("tmdb_movie_id").in("collection_id", collectionIds);
    (data ?? []).forEach((r) => owned.add(r.tmdb_movie_id as number));
  }

  const byMovie = new Map<number, FilmViewing[]>();
  for (const v of viewings) byMovie.set(v.tmdb_movie_id, [...(byMovie.get(v.tmdb_movie_id) ?? []), v]);
  const logByMovie = new Map(logs.map((l) => [l.tmdb_movie_id, l]));

  const films: WatchedFilmItem[] = logs
    .filter((l) => l.watched)
    .map((l) => {
      const vs = byMovie.get(l.tmdb_movie_id) ?? [];
      return {
        ...l,
        viewingCount: vs.length,
        lastWatchedOn: vs.find((v) => v.watched_on)?.watched_on ?? null,
        inCollection: owned.has(l.tmdb_movie_id),
      };
    });

  const diary: DiaryEntry[] = viewings
    .filter((v) => logByMovie.get(v.tmdb_movie_id)?.watched)
    .map((v) => {
      const log = logByMovie.get(v.tmdb_movie_id)!;
      const all = byMovie.get(v.tmdb_movie_id) ?? [];
      // Earliest viewing = last in the newest-first list.
      return { ...v, movie_title: log.movie_title, movie_poster: log.movie_poster, rating: log.rating, isRewatch: all[all.length - 1]?.id !== v.id };
    });

  return { available: true, films, diary };
}

/** "Bekeken" dialog save: diary entry (optional, marks watched), rating, review,
 * and optionally share once to the feed. The viewing is inserted BEFORE the
 * log so the DB trigger doesn't add an extra "today" viewing. */
export async function logFilm(input: FilmMeta & {
  addViewing: boolean;
  watchedOn: string | null;
  rating: number | null;
  review: string | null;
  shareToFeed: boolean;
}): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const userId = await requireUserId();
    if (input.addViewing) {
      const { error } = await supabase
        .from("film_viewings")
        .insert({ user_id: userId, tmdb_movie_id: input.tmdbMovieId, watched_on: cleanDate(input.watchedOn) });
      if (error) throw error;
    }
    // Only a logged viewing marks the film as watched; editing rating/review
    // alone leaves the watched flag as it was.
    const log = await upsertLog(userId, input, {
      ...(input.addViewing ? { watched: true } : {}),
      rating: cleanRating(input.rating),
      review: cleanReview(input.review),
    });
    if (input.shareToFeed) await shareReview(userId, log);
    revalidateFilm(input.tmdbMovieId);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "failed" };
  }
}

export async function setFilmWatched(meta: FilmMeta, watched: boolean): Promise<{ error: string | null }> {
  try {
    await upsertLog(await requireUserId(), meta, { watched });
    revalidateFilm(meta.tmdbMovieId);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "failed" };
  }
}

export async function setFilmRating(meta: FilmMeta, rating: number | null): Promise<{ error: string | null }> {
  try {
    await upsertLog(await requireUserId(), meta, { rating: cleanRating(rating) });
    revalidateFilm(meta.tmdbMovieId);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "failed" };
  }
}

export async function setFilmReview(meta: FilmMeta, review: string | null, shareToFeed: boolean): Promise<{ error: string | null }> {
  try {
    const userId = await requireUserId();
    const log = await upsertLog(userId, meta, { review: cleanReview(review) });
    if (shareToFeed) await shareReview(userId, log);
    revalidateFilm(meta.tmdbMovieId);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "failed" };
  }
}

/** Adds a diary entry and marks the film watched. */
export async function addViewing(meta: FilmMeta, watchedOn: string | null): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const userId = await requireUserId();
    const { error } = await supabase
      .from("film_viewings")
      .insert({ user_id: userId, tmdb_movie_id: meta.tmdbMovieId, watched_on: cleanDate(watchedOn) });
    if (error) throw error;
    await upsertLog(userId, meta, { watched: true });
    revalidateFilm(meta.tmdbMovieId);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "failed" };
  }
}

export async function deleteViewing(viewingId: string, tmdbMovieId: number): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient();
    const userId = await requireUserId();
    const { error } = await supabase.from("film_viewings").delete().eq("id", viewingId).eq("user_id", userId);
    if (error) throw error;
    revalidateFilm(tmdbMovieId);
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "failed" };
  }
}
