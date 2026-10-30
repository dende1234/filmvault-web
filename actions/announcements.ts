"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { logAdminAction } from "@/lib/admin/log";
import { isMissingError } from "@/lib/admin/migrations";
import { deliverAnnouncement } from "@/lib/announce";
import { isAudience, todayNL, type Audience } from "@/lib/announcement-audience";
import type { Announcement } from "@/types/database";

/** Recent and planned announcements; null before announcements.sql has run. */
export async function getAnnouncements(): Promise<Announcement[] | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("announcements").select("*").order("id", { ascending: false }).limit(50);
  if (isMissingError(error)) return null;
  if (error) throw error;
  return data as Announcement[];
}

/** Sends now (sendOn empty or today) or plans for a later day. Before
 * announcements.sql only "everyone, now" works, through the Edge Function. */
export async function sendAnnouncement(input: {
  title: string;
  body: string;
  audience?: Audience;
  sendOn?: string | null;
}): Promise<{ error: "invalid" | "not_ready" | "failed" | null; planned?: boolean; recipients?: number }> {
  const userId = await requireAdmin();
  const title = input.title.trim().slice(0, 120);
  const body = input.body.trim().slice(0, 2000);
  const audience = input.audience ?? "all";
  const today = todayNL();
  const sendOn = input.sendOn && /^\d{4}-\d{2}-\d{2}$/.test(input.sendOn) ? input.sendOn : today;
  if (!title || !body || !isAudience(audience) || sendOn < today) return { error: "invalid" };

  const supabase = await createClient();
  const planned = sendOn > today;
  if (planned) {
    const { error } = await supabase.from("announcements").insert({ title, body, audience, send_on: sendOn, created_by: userId });
    if (isMissingError(error)) return { error: "not_ready" };
    if (error) return { error: "failed" };
    await logAdminAction("announcement_schedule", undefined, { title, audience, send_on: sendOn });
    revalidatePath("/admin/announcement");
    return { error: null, planned: true };
  }

  const result = await deliverAnnouncement({ title, body, audience }, supabase);
  if (result.error && result.recipients === 0) return { error: result.error === "no_service_key" ? "not_ready" : "failed" };
  // Kept for the overview; fine if the table isn't there yet.
  await supabase
    .from("announcements")
    .insert({ title, body, audience, send_on: today, sent_at: new Date().toISOString(), recipients: result.recipients, created_by: userId });
  await logAdminAction("announcement_send", undefined, { title, audience, recipients: result.recipients });
  revalidatePath("/admin/announcement");
  return { error: null, recipients: result.recipients };
}

/** Removes a planned announcement that hasn't gone out yet. */
export async function cancelAnnouncement(id: number): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("announcements").delete().eq("id", id).is("sent_at", null).select("title");
  if (error) throw error;
  if (data?.length) await logAdminAction("announcement_cancel", undefined, { title: (data[0] as { title: string }).title });
  revalidatePath("/admin/announcement");
}
