import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { buildDigest, type DigestNotification } from "@/lib/digest";
import { SITE_URL } from "@/lib/site";
import { kindOfNotification, wants, type NotifyPrefs } from "@/lib/notify-prefs";

// Weekly e-mail summary (vercel.json: Mondays). Vercel Cron calls this with
// "Authorization: Bearer <CRON_SECRET>"; anything else is refused.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BATCH = 500;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin || !isEmailConfigured()) return Response.json({ skipped: "not_configured" });

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: members, error } = await admin
    .from("profiles")
    .select("*")
    .eq("email_digest", true)
    .or(`digest_sent_at.is.null,digest_sent_at.lt.${new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString()}`)
    .limit(BATCH);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const m of (members ?? []) as { id: string; email: string | null; name: string | null; language: string | null; digest_sent_at: string | null; notify_prefs?: NotifyPrefs }[]) {
    if (!m.email) continue;
    const since = m.digest_sent_at && m.digest_sent_at > weekAgo ? m.digest_sent_at : weekAgo;
    const { data: items } = await admin
      .from("user_notifications")
      .select("kind, payload, created_at")
      .eq("user_id", m.id)
      .is("read_at", null)
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);
    // Only the kinds the member wants by e-mail (notification_prefs.sql).
    const wanted = ((items ?? []) as DigestNotification[]).filter((n) => {
      const k = kindOfNotification(n.kind);
      return !k || wants(m.notify_prefs, "email", k);
    });
    const digest = buildDigest(wanted, { name: m.name, locale: m.language === "en" ? "en" : "nl", siteUrl: SITE_URL });
    if (digest && (await sendEmail({ email: m.email, name: m.name }, digest.subject, digest.html, digest.text))) sent++;
    // Also when there was nothing to send: checked for this week.
    await admin.from("profiles").update({ digest_sent_at: new Date().toISOString() }).eq("id", m.id);
  }
  return Response.json({ checked: members?.length ?? 0, sent });
}
