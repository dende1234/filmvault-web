"use server";

// Direct port of badges/BadgeRepository.kt — same 11 fixed badges/thresholds,
// same "check and award on visit" model (no DB trigger/cron).

import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { getUserCollections, getCollectionItemsForCollections } from "@/actions/collections";
import { getAcceptedFriendIds } from "@/actions/friends";
import { getPostsByAuthor } from "@/actions/posts";
import type { UserBadge } from "@/types/database";

export async function getEarnedBadges(): Promise<UserBadge[]> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase.from("user_badges").select("*").eq("user_id", userId);
  if (error) throw error;
  return data as UserBadge[];
}

/** Another user's earned badges, for their public profile — relies on the
 * "user_badges_select_all" RLS policy (supabase/sql/user_badges_public_read.sql,
 * a fix shipped alongside this Fase 4 round: badge rows carry no sensitive
 * data, same reasoning that already made `follows` public-readable). */
export async function getPublicBadges(userId: string): Promise<UserBadge[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_badges").select("*").eq("user_id", userId);
  if (error) throw error;
  return data as UserBadge[];
}

/** Returns the newly-awarded badge ids (empty if nothing new). */
export async function checkAndAwardBadges(): Promise<string[]> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const alreadyEarned = new Set((await getEarnedBadges()).map((b) => b.badge_id));

  const collections = await getUserCollections();
  const rawItems = await getCollectionItemsForCollections(collections.map((c) => c.id));
  const seen = new Set<string>();
  let filmCount = 0;
  for (const item of rawItems) {
    if (!seen.has(item.item_group_id)) {
      seen.add(item.item_group_id);
      filmCount++;
    }
  }
  const friendCount = (await getAcceptedFriendIds(userId)).length;
  const reviewCount = (await getPostsByAuthor(userId)).length;
  // No loan history is kept (returning an item clears loaned_to) — this reflects whether the
  // user currently has an item on loan at the moment badges are checked, not a lifetime count.
  const hasLoanedItem = rawItems.some((item) => item.loaned_to !== null);

  const shouldHave: string[] = [];
  if (collections.length >= 1) shouldHave.push("first_collection");
  if (collections.length >= 5) shouldHave.push("five_collections");
  if (filmCount >= 1) shouldHave.push("first_film");
  if (filmCount >= 10) shouldHave.push("ten_films");
  if (filmCount >= 50) shouldHave.push("fifty_films");
  if (filmCount >= 100) shouldHave.push("hundred_films");
  if (friendCount >= 1) shouldHave.push("first_friend");
  if (friendCount >= 5) shouldHave.push("five_friends");
  if (friendCount >= 10) shouldHave.push("ten_friends");
  if (reviewCount >= 1) shouldHave.push("first_review");
  if (hasLoanedItem) shouldHave.push("generous_lender");
  // Approved barcode submissions (a box counts once). If the RPC is missing,
  // contributors_region.sql hasn't run and the CHECK on user_badges would
  // reject these ids, so they're only awarded once it has.
  const { data: approvedCount, error: approvedError } = await supabase.rpc("my_approved_barcode_count", { p_since: null });
  if (!approvedError && typeof approvedCount === "number") {
    if (approvedCount >= 1) shouldHave.push("first_barcode");
    if (approvedCount >= 10) shouldHave.push("ten_barcodes");
    if (approvedCount >= 50) shouldHave.push("fifty_barcodes");
  }

  // Collectors who signed up via your invite link (invite_rewards.sql; until
  // then the RPC is missing and the CHECK would reject these ids).
  const { data: inviteCount, error: inviteError } = await supabase.rpc("my_invite_count");
  if (!inviteError && typeof inviteCount === "number") {
    if (inviteCount >= 1) shouldHave.push("first_invite");
    if (inviteCount >= 5) shouldHave.push("five_invites");
  }

  const newlyEarned = shouldHave.filter((id) => !alreadyEarned.has(id));
  if (newlyEarned.length > 0) {
    const { error } = await supabase
      .from("user_badges")
      .insert(newlyEarned.map((badge_id) => ({ user_id: userId, badge_id })));
    if (error) throw error;
  }
  return newlyEarned;
}

export type LeaderboardRow = { userId: string; name: string; avatarUrl: string | null; count: number };

/** Top 20 barcode contributors this month and all time, plus your own counts.
 * Empty until contributors_region.sql has run. */
export async function getContributorLeaderboard(): Promise<{
  month: LeaderboardRow[];
  allTime: LeaderboardRow[];
  mine: { month: number; allTime: number };
} | null> {
  const supabase = await createClient();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const [month, allTime, mineMonth, mineAll] = await Promise.all([
    supabase.rpc("barcode_contributor_leaderboard", { p_since: monthStart }),
    supabase.rpc("barcode_contributor_leaderboard", { p_since: null }),
    supabase.rpc("my_approved_barcode_count", { p_since: monthStart }),
    supabase.rpc("my_approved_barcode_count", { p_since: null }),
  ]);
  if (allTime.error) return null;
  const rows = (data: unknown): LeaderboardRow[] =>
    ((data ?? []) as { user_id: string; name: string; avatar_url: string | null; approved_count: number | string }[]).map((r) => ({
      userId: r.user_id,
      name: r.name,
      avatarUrl: r.avatar_url,
      count: Number(r.approved_count),
    }));
  return {
    month: rows(month.data),
    allTime: rows(allTime.data),
    mine: { month: Number(mineMonth.data ?? 0), allTime: Number(mineAll.data ?? 0) },
  };
}

/** How many collectors signed up via your invite link; null before
 * invite_rewards.sql has run. */
export async function getMyInviteCount(): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_invite_count");
  return error || typeof data !== "number" ? null : data;
}
