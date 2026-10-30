"use server";

// Direct port of social/FollowRepository.kt — "follows" is deliberately
// separate from friend_requests (direct, no approval) and only ever gates
// posts/post_comments visibility, never collections (social_feed.sql).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";

export async function isFollowing(followeeId: string): Promise<boolean> {
  const supabase = await createClient();
  const followerId = await requireUserId();
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId);
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function follow(followeeId: string): Promise<void> {
  const supabase = await createClient();
  const followerId = await requireUserId();
  const { error } = await supabase.from("follows").insert({ follower_id: followerId, followee_id: followeeId });
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function unfollow(followeeId: string): Promise<void> {
  const supabase = await createClient();
  const followerId = await requireUserId();
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("follows").select("followee_id").eq("follower_id", userId);
  if (error) throw error;
  return (data as { followee_id: string }[]).map((r) => r.followee_id);
}

export async function getFollowerCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("followee_id", userId);
  if (error) throw error;
  return count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("follower_id", userId);
  if (error) throw error;
  return count ?? 0;
}
