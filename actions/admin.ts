"use server";

// Direct port of admin/AdminRepository.kt — same table/RPC/Edge-Function
// names. requireAdmin() re-checks admin status server-side on every call,
// same "reachable via deep link, don't just trust the caller" reasoning as
// every Android admin ViewModel's load().

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { logAdminAction } from "@/lib/admin/log";
import { findBarcodesByCode } from "@/actions/barcodes";
import { adminRegisterBarcode, approvePendingBarcode } from "@/actions/approvals";
import { getTitleDetail, searchMovies, searchTv } from "@/lib/tmdb/server";
import { BarcodeAlreadyRegisteredError } from "@/lib/errors";
import { isValidEanUpc, normalizeBarcode } from "@/lib/barcode";
import { getLocale } from "@/lib/preferences";
import type { AdminProfile, AdminStats, Barcode, PendingBarcode } from "@/types/database";
import type { MovieSummaryDto } from "@/types/tmdb";

export async function setUserAdminStatus(targetUserId: string, isAdmin: boolean): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_admin_status", {
    target_user_id: targetUserId,
    new_is_admin: isAdmin,
  });
  if (error) throw error;
  await logAdminAction(isAdmin ? "user_admin_on" : "user_admin_off", { type: "user", id: targetUserId });
  revalidatePath("/admin/users");
}

export async function getAppStats(): Promise<AdminStats> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_get_app_stats");
  if (error) throw error;
  return (data as AdminStats[])[0];
}

/** Deletes ANOTHER user's account and all their data — via a separate
 * admin-delete-user Edge Function, not the self-service delete-account
 * one used by actions/profile.ts's deleteAccount(), since that one trusts
 * the caller's own JWT alone. */
export async function deleteUserAccount(targetUserId: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: who } = await supabase.from("profiles").select("name, email").eq("id", targetUserId).maybeSingle();
  const { error } = await supabase.functions.invoke("admin-delete-user", { body: { target_user_id: targetUserId } });
  if (error) throw error;
  await logAdminAction("user_delete", { type: "user", id: targetUserId }, who ?? {});
  revalidatePath("/admin/users");
}

/** Wraps adminRegisterBarcode so the client doesn't need to import
 * lib/tmdb/server.ts directly (it's marked "server-only") just to resolve
 * the conflicting film's title for the duplicate-barcode error message. */
export async function adminRegisterBarcodeWithConflictTitle(
  tmdbMovieId: number,
  barcode: string,
  type: string,
  editie: string,
  seasons?: number[] | null,
): Promise<{ error: "duplicate"; conflictTitle: string } | { error: "other" } | { error: null; id: string }> {
  try {
    const id = await adminRegisterBarcode(tmdbMovieId, normalizeBarcode(barcode), type, editie, seasons);
    return { error: null, id };
  } catch (e) {
    if (e instanceof BarcodeAlreadyRegisteredError) {
      const locale = await getLocale();
      const conflictTitle = await getTitleDetail(e.existingTmdbMovieId, locale)
        .then((m) => m.title)
        .catch(() => "");
      return { error: "duplicate", conflictTitle };
    }
    return { error: "other" };
  }
}

/** A master film-list entry plus the TMDB title/poster to show for it. */
export type KnownBarcodeEntry = Pick<Barcode, "id" | "barcode" | "tmdb_movie_id" | "type" | "editie" | "is_box" | "box_name"> & {
  title: string;
  poster_path: string | null;
};

async function withMovieInfo(entries: Barcode[], locale: string): Promise<KnownBarcodeEntry[]> {
  const ids = Array.from(new Set(entries.map((e) => e.tmdb_movie_id)));
  const details = new Map(
    await Promise.all(
      ids.map(async (id) => [id, await getTitleDetail(id, locale).catch(() => null)] as const),
    ),
  );
  return entries.map((e) => ({
    id: e.id,
    barcode: e.barcode,
    tmdb_movie_id: e.tmdb_movie_id,
    type: e.type,
    editie: e.editie,
    is_box: e.is_box,
    box_name: e.box_name,
    title: details.get(e.tmdb_movie_id)?.title ?? `TMDB #${e.tmdb_movie_id}`,
    poster_path: details.get(e.tmdb_movie_id)?.poster_path ?? null,
  }));
}

/** Barcode-station step 1: is this code already on the master film list? */
export async function adminLookupBarcode(rawCode: string): Promise<KnownBarcodeEntry[]> {
  await requireAdmin();
  const code = normalizeBarcode(rawCode);
  if (!code) return [];
  return withMovieInfo(await findBarcodesByCode(code), await getLocale());
}

/** Existing master-list entries for one film, so the admin sees which
 * editions are already covered before adding another barcode. */
export async function adminGetBarcodesForMovie(tmdbMovieId: number): Promise<KnownBarcodeEntry[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("barcodes").select("*").eq("tmdb_movie_id", tmdbMovieId);
  if (error) throw error;
  return withMovieInfo(data as Barcode[], await getLocale());
}

export type BulkBarcodeRowInput = { barcode: string; title: string; year: string; kind?: "movie" | "tv" | null };

export type BulkBarcodeRowMatch = {
  barcode: string;
  validChecksum: boolean;
  known: KnownBarcodeEntry[];
  candidates: MovieSummaryDto[];
};

const BULK_MAX_ROWS = 200;
const BULK_SEARCH_CONCURRENCY = 5;

/** CSV/bulk import: for every row, normalize + validate the barcode, check
 * the master list, and fetch the top TMDB candidates for the title (rows
 * whose release year matches the given year first). One server action for
 * the whole batch — the client dispatches actions sequentially, so this
 * parallelizes the TMDB searches server-side instead. */
export async function adminMatchBarcodeRows(rows: BulkBarcodeRowInput[]): Promise<BulkBarcodeRowMatch[]> {
  await requireAdmin();
  if (rows.length > BULK_MAX_ROWS) throw new Error("too_many_rows");
  const locale = await getLocale();
  const codes = rows.map((r) => normalizeBarcode(String(r.barcode ?? "")));

  const supabase = await createClient();
  const uniqueCodes = Array.from(new Set(codes.filter(Boolean)));
  const { data: knownRows, error } = uniqueCodes.length
    ? await supabase.from("barcodes").select("*").in("barcode", uniqueCodes)
    : { data: [], error: null };
  if (error) throw error;
  const known = await withMovieInfo((knownRows ?? []) as Barcode[], locale);

  const candidates: MovieSummaryDto[][] = new Array(rows.length).fill([]);
  let next = 0;
  async function worker() {
    while (next < rows.length) {
      const i = next++;
      const title = String(rows[i].title ?? "").trim();
      if (!title) continue;
      const year = String(rows[i].year ?? "").trim();
      const kind = rows[i].kind ?? null;
      const search = (fn: typeof searchMovies) => fn(title, 1, locale).then((page) => page.results ?? []).catch(() => []);
      // Same rule as the user import: known kind → that search; unknown →
      // films first, series as fallback. Series come back with negative ids.
      let results = await search(kind === "tv" ? searchTv : searchMovies);
      if (!kind && results.length === 0) results = await search(searchTv);
      const ranked = year
        ? [...results].sort(
            (a, b) => Number(b.release_date?.startsWith(year) ?? false) - Number(a.release_date?.startsWith(year) ?? false),
          )
        : results;
      candidates[i] = ranked.slice(0, 5);
    }
  }
  await Promise.all(Array.from({ length: BULK_SEARCH_CONCURRENCY }, worker));

  return codes.map((code, i) => ({
    barcode: code,
    validChecksum: isValidEanUpc(code),
    known: known.filter((k) => k.barcode === code),
    candidates: candidates[i],
  }));
}

/** "Aanpassen & goedkeuren": corrects a single (non-box) pending submission
 * — film, type, editie — and then approves it. Only ids/values come from
 * the client; the title/poster are resolved from TMDB server-side. */
export async function adminApprovePendingWithChanges(
  pendingId: string,
  tmdbMovieId: number,
  type: string,
  editie: string,
): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: row, error: readError } = await supabase
    .from("pending_barcodes")
    .select("*")
    .eq("id", pendingId)
    .eq("status", "pending")
    .single();
  if (readError) throw readError;
  const pending = row as PendingBarcode;
  if (pending.box_group_id) throw new Error("box_not_supported");

  const changes: Partial<PendingBarcode> = { type, editie };
  if (tmdbMovieId !== pending.tmdb_movie_id) {
    const movie = await getTitleDetail(tmdbMovieId, await getLocale());
    changes.tmdb_movie_id = movie.id;
    changes.movie_title = movie.title;
    changes.movie_poster = movie.poster_path;
  }
  const { error: updateError } = await supabase.from("pending_barcodes").update(changes).eq("id", pendingId);
  if (updateError) throw updateError;

  await approvePendingBarcode({ ...pending, ...changes });
  await logAdminAction("barcode_approve_with_changes", { type: "pending_barcode", id: pendingId }, { tmdbMovieId, type, editie });
}

export type GrowthStats = {
  tracking_since: string | null;
  total_members: number;
  tracked_signups: number;
  signups_last_30d: number;
  active_last_30d: number;
  activated: number;
  returned_30d: number;
  return_cohort: number;
  newsletter_opt_ins: number;
  by_source: { source: string; signups: number; activated: number }[];
};

/** KPI's for /admin/growth (admin_growth_stats RPC, growth_tracking.sql).
 * Returns null when that migration hasn't been run yet. */
export async function getGrowthStats(): Promise<GrowthStats | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_growth_stats");
  if (error) return null;
  return data as GrowthStats;
}

const USERS_PAGE = 50;

/** /admin/users: search on name or e-mail, newest members first, 50 a page. */
export async function getProfilesPage(query: string, page: number): Promise<{ profiles: AdminProfile[]; total: number; pageSize: number }> {
  await requireAdmin();
  const supabase = await createClient();
  // PostgREST's or() syntax uses , ( ) and * — keep them out of the term.
  const q = query.replace(/[,()*%\\]/g, " ").trim().slice(0, 80);
  let builder = supabase
    .from("profiles")
    .select("id, name, email, avatar_url, is_admin, created_at", { count: "exact" })
    .order("created_at", { ascending: false, nullsFirst: false })
    .range(page * USERS_PAGE, page * USERS_PAGE + USERS_PAGE - 1);
  if (q) builder = builder.or(`name.ilike.*${q}*,email.ilike.*${q}*`);
  const { data, error, count } = await builder;
  if (error) throw error;
  return { profiles: (data ?? []) as AdminProfile[], total: count ?? 0, pageSize: USERS_PAGE };
}

export type AdminUserDetail = {
  profile: AdminProfile;
  /** null before admin_users.sql has run. */
  overview: { collections: number; public_collections: number; copies: number; wishlist: number; last_added: string | null } | null;
  submissions: { pending: number; approved: number; rejected: number; recent: Pick<PendingBarcode, "id" | "barcode" | "movie_title" | "status" | "submitted_at">[] };
  feedback: { id: string; created_at: string; kind: string; message: string; status: string }[];
};

/** /admin/users/<id>: one member at a glance. */
export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id, name, email, avatar_url, is_admin, created_at").eq("id", userId).maybeSingle();
  if (!profile) return null;

  const countStatus = (status: string) =>
    supabase.from("pending_barcodes").select("id", { count: "exact", head: true }).eq("submitted_by", userId).eq("status", status);
  const [overview, pending, approved, rejected, recent, feedback] = await Promise.all([
    supabase.rpc("admin_user_overview", { p_user_id: userId }),
    countStatus("pending"),
    countStatus("approved"),
    countStatus("rejected"),
    supabase
      .from("pending_barcodes")
      .select("id, barcode, movie_title, status, submitted_at")
      .eq("submitted_by", userId)
      .order("submitted_at", { ascending: false })
      .limit(20),
    supabase.from("user_feedback").select("id, created_at, kind, message, status").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
  ]);
  return {
    profile: profile as AdminProfile,
    overview: overview.error ? null : (overview.data as AdminUserDetail["overview"]),
    submissions: {
      pending: pending.count ?? 0,
      approved: approved.count ?? 0,
      rejected: rejected.count ?? 0,
      recent: (recent.data ?? []) as AdminUserDetail["submissions"]["recent"],
    },
    feedback: (feedback.data ?? []) as AdminUserDetail["feedback"],
  };
}

/** Trusted contributors (auto_approve.sql): their single-release
 * submissions are approved right away. null = SQL hasn't run. */
export async function getTrusted(userId: string): Promise<boolean | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("trusted_contributors").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) return null;
  return !!data;
}

export async function setTrusted(userId: string, trusted: boolean): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = trusted
    ? await supabase.from("trusted_contributors").upsert({ user_id: userId })
    : await supabase.from("trusted_contributors").delete().eq("user_id", userId);
  if (error) throw error;
  await logAdminAction(trusted ? "user_trust_on" : "user_trust_off", { type: "user", id: userId });
  revalidatePath(`/admin/users/${userId}`);
}
