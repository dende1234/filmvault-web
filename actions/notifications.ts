"use server";

// In-app notifications (contributors_region.sql): for now "your submitted
// barcode was approved / rejected". Created by admins while reviewing (see
// notifySubmitter in actions/collections.ts); read and marked here. Before the
// SQL has run every call quietly returns nothing.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { UserNotification } from "@/types/database";

function isMissing(error: { code?: string } | null) {
  return !!error && ["PGRST205", "42P01"].includes(error.code ?? "");
}

export async function getNotifications(): Promise<UserNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, kind, payload, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (isMissing(error) || error) return [];
  return data as UserNotification[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/", "layout"); // the menu badge
}
