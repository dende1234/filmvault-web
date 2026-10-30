import { createAdminClient } from "@/lib/supabase/admin";
import { deliverAnnouncement } from "@/lib/announce";
import { todayNL } from "@/lib/announcement-audience";
import type { Announcement } from "@/types/database";

// Planned announcements (announcements.sql), sent once a day (vercel.json).
// Vercel Cron calls this with "Authorization: Bearer <CRON_SECRET>".
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return Response.json({ skipped: "not_configured" });

  const { data, error } = await admin.from("announcements").select("*").is("sent_at", null).lte("send_on", todayNL()).order("id").limit(20);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const a of (data ?? []) as Announcement[]) {
    // Claim it first, so a second run can't send it twice.
    const { data: claimed } = await admin
      .from("announcements")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", a.id)
      .is("sent_at", null)
      .select("id");
    if (!claimed?.length) continue;
    const result = await deliverAnnouncement(a, admin);
    await admin.from("announcements").update({ recipients: result.recipients }).eq("id", a.id);
    if (result.error) console.error("[announcements]", a.id, result.error);
    sent++;
  }
  return Response.json({ sent });
}
