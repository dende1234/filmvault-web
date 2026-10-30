"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { isMissingError } from "@/lib/admin/migrations";

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Saves this device's push subscription (push_subscriptions.sql). */
export async function savePushSubscription(sub: Sub, userAgent: string): Promise<{ error: "not_ready" | "invalid" | null }> {
  await requireUserId();
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_agent: userAgent.slice(0, 300) }, { onConflict: "endpoint" });
  if (isMissingError(error)) return { error: "not_ready" };
  if (error) throw error;
  return { error: null };
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await requireUserId();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
