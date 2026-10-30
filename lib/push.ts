import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { wants, type NotifyKind, type NotifyPrefs } from "@/lib/notify-prefs";

type Text = { title: string; body: string };
/** Both languages; the member's profile language picks one. */
export type PushMessage = { nl: Text; en: Text; url: string };

/** Sends a push message to every device the member switched it on for
 * (push_subscriptions.sql). Needs the VAPID keys and the service role key;
 * without them, or on any error, it quietly does nothing. Devices that
 * unsubscribed (404/410) are removed. */
export async function sendPushToUser(userId: string, msg: PushMessage, kind?: NotifyKind) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const admin = createAdminClient();
  if (!publicKey || !privateKey || !admin) return;
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || SITE_URL, publicKey, privateKey);
    const [{ data }, { data: profile }] = await Promise.all([
      admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId),
      admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    // The member's per-kind choice (notification_prefs.sql); missing = yes.
    if (kind && !wants((profile as { notify_prefs?: NotifyPrefs } | null)?.notify_prefs, "push", kind)) return;
    const text = profile?.language === "en" ? msg.en : msg.nl;
    const payload = JSON.stringify({ ...text, url: msg.url });
    await Promise.all(
      ((data ?? []) as { id: number; endpoint: string; p256dh: string; auth: string }[]).map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 24 * 3600 });
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
          else console.error("[push] send failed", status);
        }
      }),
    );
  } catch (e) {
    console.error("[push]", e);
  }
}
