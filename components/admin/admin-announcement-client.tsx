"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Send, X } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { cancelAnnouncement, sendAnnouncement } from "@/actions/announcements";
import { AUDIENCES, todayNL, type Audience } from "@/lib/announcement-audience";
import type { Announcement } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AUDIENCE_LABEL = {
  all: "admin_announcement_audience_all",
  nl: "admin_announcement_audience_nl",
  en: "admin_announcement_audience_en",
  contributors: "admin_announcement_audience_contributors",
  admins: "admin_announcement_audience_admins",
} as const;

/** Write an announcement, pick who gets it and when. `history` is null
 * before announcements.sql: then only "everyone, now" is offered. */
export function AdminAnnouncementClient({ history }: { history: Announcement[] | null }) {
  const { t } = useT();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [sendOn, setSendOn] = useState("");
  const [pending, start] = useTransition();
  const ready = history !== null;
  const today = todayNL();
  const planned = ready && sendOn > today;
  const canSend = title.trim().length > 0 && body.trim().length > 0 && !pending;

  function handleSend() {
    if (!canSend) return;
    start(async () => {
      const r = await sendAnnouncement({ title, body, audience, sendOn: ready ? sendOn : null }).catch(() => ({ error: "failed" as const }));
      if (r.error) {
        toast.error(t(r.error === "not_ready" ? "admin_announcement_not_ready" : r.error === "invalid" ? "admin_announcement_invalid" : "admin_announcement_error_send"));
        return;
      }
      toast.success(
        "planned" in r && r.planned
          ? t("admin_announcement_planned")
          : "recipients" in r && r.recipients
            ? t("admin_announcement_sent_to", r.recipients)
            : t("admin_announcement_success"),
      );
      setTitle("");
      setBody("");
      setSendOn("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t("admin_announcement_title")}</h1>
      <p className="text-sm text-muted-foreground">{t("admin_announcement_description")}</p>

      <Input placeholder={t("admin_announcement_title_label")} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder={t("admin_announcement_body_label")} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} />

      {ready ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-audience">{t("admin_announcement_audience")}</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
              <SelectTrigger id="ann-audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {t(AUDIENCE_LABEL[a])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-date">{t("admin_announcement_send_on")}</Label>
            <Input id="ann-date" type="date" min={today} value={sendOn} onChange={(e) => setSendOn(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {t(audience === "all" ? "admin_announcement_hint_all" : "admin_announcement_hint_targeted")} {t("admin_announcement_hint_date")}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("admin_announcement_needs_sql")}</p>
      )}

      <Button disabled={!canSend} onClick={handleSend}>
        {planned ? <CalendarClock className="size-4" aria-hidden /> : <Send className="size-4" aria-hidden />}
        {t(planned ? "admin_announcement_plan_button" : "admin_announcement_send_button")}
      </Button>

      {history && history.length > 0 && (
        <section className="mt-4 flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("admin_announcement_history")}</h2>
          <ul className="flex flex-col gap-2">
            {history.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-card border border-border p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(AUDIENCE_LABEL[a.audience] ?? "admin_announcement_audience_all")} ·{" "}
                    {a.sent_at
                      ? t("admin_announcement_sent_on", a.send_on, a.recipients ?? 0)
                      : t("admin_announcement_planned_on", a.send_on)}
                  </p>
                </div>
                {!a.sent_at && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t("admin_announcement_cancel")}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await cancelAnnouncement(a.id).catch(() => toast.error(t("admin_announcement_error_send")));
                        router.refresh();
                      })
                    }
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
