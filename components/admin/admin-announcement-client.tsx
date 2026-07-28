"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/locale-provider";
import { sendAnnouncement } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function AdminAnnouncementClient() {
  const { t } = useT();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !isSending;

  async function handleSend() {
    if (!canSend) return;
    setIsSending(true);
    setError(null);
    setInfo(null);
    try {
      await sendAnnouncement(title.trim(), body.trim());
      setInfo(t("admin_announcement_success"));
      setTitle("");
      setBody("");
    } catch {
      setError(t("admin_announcement_error_send"));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("admin_announcement_title")}</h1>
      <p className="text-sm text-muted-foreground">{t("admin_announcement_description")}</p>

      <Input placeholder={t("admin_announcement_title_label")} value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder={t("admin_announcement_body_label")} value={body} onChange={(e) => setBody(e.target.value)} />

      {info && <p className="text-sm text-muted-foreground">{info}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button disabled={!canSend} onClick={handleSend}>
        {t("admin_announcement_send_button")}
      </Button>
    </div>
  );
}
