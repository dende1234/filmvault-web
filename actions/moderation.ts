"use server";

// /admin/reports → Recent, Blocked (moderation.sql). Reading and deleting
// other members' posts goes through security-definer functions, since feed
// posts are only readable by followers.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { logAdminAction } from "@/lib/admin/log";
import { isMissingError } from "@/lib/admin/migrations";

export type RecentPost = { id: string; author_id: string; author: string | null; title: string | null; body: string; movie_title: string | null; created_at: string | null };
export type RecentComment = { id: string; post_id: string; author_id: string; author: string | null; body: string; created_at: string | null };
export type BlockedMember = { user_id: string; reason: string | null; blocked_at: string; name: string | null; email: string | null };

/** null = moderation.sql hasn't run. */
export async function getRecentContent(): Promise<{ posts: RecentPost[]; comments: RecentComment[] } | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_recent_content", { p_limit: 50 });
  if (isMissingError(error)) return null;
  if (error) throw error;
  return data as { posts: RecentPost[]; comments: RecentComment[] };
}

export async function adminDeleteContent(type: "post" | "comment", id: string, preview: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_content", { p_type: type, p_id: id });
  if (error) throw error;
  await logAdminAction(type === "post" ? "post_delete" : "comment_delete", { type, id }, { preview: preview.slice(0, 120) });
  revalidatePath("/admin/reports");
  revalidatePath("/feed");
}

/** null = moderation.sql hasn't run. */
export async function getBlockedMembers(): Promise<BlockedMember[] | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("blocked_members").select("user_id, reason, blocked_at").order("blocked_at", { ascending: false });
  if (isMissingError(error)) return null;
  if (error) throw error;
  const rows = (data ?? []) as Omit<BlockedMember, "name" | "email">[];
  const { data: profiles } = rows.length ? await supabase.from("profiles").select("id, name, email").in("id", rows.map((r) => r.user_id)) : { data: [] };
  const byId = new Map(((profiles ?? []) as { id: string; name: string | null; email: string | null }[]).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, name: byId.get(r.user_id)?.name ?? null, email: byId.get(r.user_id)?.email ?? null }));
}

export async function setBlocked(userId: string, blocked: boolean, reason?: string | null): Promise<{ error: "not_ready" | null }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = blocked
    ? await supabase.from("blocked_members").upsert({ user_id: userId, reason: reason?.trim().slice(0, 300) || null })
    : await supabase.from("blocked_members").delete().eq("user_id", userId);
  if (isMissingError(error)) return { error: "not_ready" };
  if (error) throw error;
  await logAdminAction(blocked ? "user_block" : "user_unblock", { type: "user", id: userId }, reason ? { reason } : {});
  revalidatePath("/admin/reports");
  revalidatePath(`/admin/users/${userId}`);
  return { error: null };
}
