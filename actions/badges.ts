"use server";

// Direct port of badges/BadgeRepository.kt — same 11 fixed badges/thresholds,
// same "check and award on visit" model (no DB trigger/cron).

import { createClient } from "@/lib/supabase/server";
import { getUserCollections, getCollectionItemsForCollections } from "@/actions/collections";
import { getAcceptedFriendIds } from "@/actions/friends";
import { getPostsByAuthor } from "@/actions/posts";
import type { UserBadge } from "@/types/database";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  return user.id;
}

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

  const newlyEarned = shouldHave.filter((id) => !alreadyEarned.has(id));
  if (newlyEarned.length > 0) {
    const { error } = await supabase
      .from("user_badges")
      .insert(newlyEarned.map((badge_id) => ({ user_id: userId, badge_id })));
    if (error) throw error;
  }
  return newlyEarned;
}
