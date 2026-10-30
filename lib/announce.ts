import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { sendPushToUser } from "@/lib/push";
import type { Audience } from "@/lib/announcement-audience";

export type AnnouncementToSend = { title: string; body: string; audience: Audience };

const CHUNK = 500;

async function recipients(admin: SupabaseClient, audience: Audience): Promise<string[]> {
  if (audience === "contributors") {
    const rows = await fetchAll<{ submitted_by: string | null }>((from, to) =>
      admin.from("pending_barcodes").select("submitted_by").not("submitted_by", "is", null).order("id").range(from, to),
    );
    return [...new Set(rows.map((r) => r.submitted_by).filter((v): v is string => !!v))];
  }
  const rows = await fetchAll<{ id: string }>((from, to) => {
    let q = admin.from("profiles").select("id");
    if (audience === "nl") q = q.or("language.is.null,language.neq.en");
    if (audience === "en") q = q.eq("language", "en");
    if (audience === "admins") q = q.eq("is_admin", true);
    return q.order("id").range(from, to);
  });
  return rows.map((r) => r.id);
}

/** Sends one announcement: for "all" also through the app's own
 * send-announcement Edge Function (as before), and for every audience as a
 * notification in /meldingen plus web push. `caller` is the client that may
 * invoke the Edge Function (the admin's session, or the service role in the
 * cron). Returns how many members got the in-app notification. */
export async function deliverAnnouncement(a: AnnouncementToSend, caller: SupabaseClient): Promise<{ recipients: number; error: string | null }> {
  let error: string | null = null;
  if (a.audience === "all") {
    const { error: fnError } = await caller.functions.invoke("send-announcement", { body: { title: a.title, body: a.body } });
    if (fnError) error = fnError.message;
  }

  const admin = createAdminClient();
  // Without the service role key only the Edge Function route exists.
  if (!admin) return { recipients: 0, error: a.audience === "all" ? error : "no_service_key" };

  const ids = await recipients(admin, a.audience);
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { error: insError } = await admin
      .from("user_notifications")
      .insert(ids.slice(i, i + CHUNK).map((user_id) => ({ user_id, kind: "announcement", payload: { title: a.title, body: a.body } })));
    if (insError) return { recipients: i, error: insError.message };
  }

  // Push only to members with a device registered, one at a time.
  const { data: subs } = await admin.from("push_subscriptions").select("user_id").in("user_id", ids.slice(0, 1000));
  const withPush = [...new Set(((subs ?? []) as { user_id: string }[]).map((s) => s.user_id))];
  const text = { title: a.title, body: a.body.length > 140 ? `${a.body.slice(0, 139)}…` : a.body };
  for (const id of withPush) await sendPushToUser(id, { nl: text, en: text, url: "/meldingen" }, "news");

  return { recipients: ids.length, error };
}
