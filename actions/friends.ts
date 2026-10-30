"use server";

// Direct port of friends/FriendRepository.kt — same table/RPC names, same
// "friendship = accepted request either direction" logic.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import type { FriendRequest, FriendRequestWithProfile, ProfileSearchResult } from "@/types/database";
import { after } from "next/server";
import { sendPushToUser } from "@/lib/push";

export async function searchProfiles(query: string): Promise<ProfileSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_profiles", { search_query: trimmed });
  if (error) throw error;
  return data as ProfileSearchResult[];
}

export async function getPublicProfiles(userIds: string[]): Promise<ProfileSearchResult[]> {
  if (userIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_profiles", { user_ids: userIds });
  if (error) throw error;
  return data as ProfileSearchResult[];
}

export async function findExistingRequestBetween(userA: string, userB: string): Promise<FriendRequest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .or(
      `and(sender_id.eq.${userA},receiver_id.eq.${userB}),and(sender_id.eq.${userB},receiver_id.eq.${userA})`,
    )
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as FriendRequest | null;
}

/** Throws a recognizable Error (message "already_friends" / "already_pending")
 * instead of inserting a duplicate — mirrors sendRequest's
 * FriendRequestConflictException branch in the Kotlin ViewModel. */
export async function sendFriendRequest(receiverId: string): Promise<void> {
  const supabase = await createClient();
  const senderId = await requireUserId();
  const existing = await findExistingRequestBetween(senderId, receiverId);
  if (existing?.status === "accepted") throw new Error("already_friends");
  if (existing?.status === "pending") throw new Error("already_pending");

  const { error } = await supabase.from("friend_requests").insert({ sender_id: senderId, receiver_id: receiverId });
  if (error) throw error;
  const { data: me } = await supabase.from("profiles").select("name").eq("id", senderId).maybeSingle();
  after(() =>
    sendPushToUser(receiverId, {
      nl: { title: "Nieuw vriendverzoek", body: `${me?.name || "Iemand"} wil vrienden worden op Filmory.` },
      en: { title: "New friend request", body: `${me?.name || "Someone"} wants to be friends on Filmory.` },
      url: "/friends",
    }, "friends"),
  );
  revalidatePath("/friends");
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId);
  if (error) throw error;
  revalidatePath("/friends");
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", requestId);
  if (error) throw error;
  revalidatePath("/friends");
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("friend_requests").delete().eq("id", requestId);
  if (error) throw error;
  revalidatePath("/friends");
}

export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("sender_id, receiver_id")
    .eq("status", "accepted")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  if (error) throw error;
  return (data as { sender_id: string; receiver_id: string }[]).map((r) =>
    r.sender_id === userId ? r.receiver_id : r.sender_id,
  );
}

export async function getFriends(): Promise<ProfileSearchResult[]> {
  const userId = await requireUserId();
  const friendIds = await getAcceptedFriendIds(userId);
  return getPublicProfiles(friendIds);
}

export async function getIncomingRequests(): Promise<FriendRequestWithProfile[]> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("receiver_id", userId)
    .eq("status", "pending");
  if (error) throw error;
  const requests = data as FriendRequest[];
  const profiles = await getPublicProfiles(requests.map((r) => r.sender_id));
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return requests.flatMap((request) => {
    const profile = byId.get(request.sender_id);
    return profile ? [{ request, otherProfile: profile }] : [];
  });
}

export async function getOutgoingRequests(): Promise<FriendRequestWithProfile[]> {
  const supabase = await createClient();
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("sender_id", userId)
    .eq("status", "pending");
  if (error) throw error;
  const requests = data as FriendRequest[];
  const profiles = await getPublicProfiles(requests.map((r) => r.receiver_id));
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return requests.flatMap((request) => {
    const profile = byId.get(request.receiver_id);
    return profile ? [{ request, otherProfile: profile }] : [];
  });
}
