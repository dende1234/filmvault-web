"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { setNotifyPrefs } from "@/actions/profile";
import { NOTIFY_KINDS, wants, type NotifyChannel, type NotifyKind, type NotifyPrefs } from "@/lib/notify-prefs";
import { Checkbox } from "@/components/ui/checkbox";

const KIND_LABEL = {
  barcode: "notify_kind_barcode",
  friends: "notify_kind_friends",
  loan: "notify_kind_loan",
  news: "notify_kind_news",
} as const;

/** Which kinds arrive by push and by e-mail (digest). Friend requests only
 * go out by push, so that cell is left empty for e-mail. */
export function NotifyPrefsForm({ initial }: { initial: NotifyPrefs | undefined }) {
  const { t } = useT();
  const [prefs, setPrefs] = useState<NotifyPrefs>(initial ?? {});
  const [pending, start] = useTransition();

  function toggle(channel: NotifyChannel, kind: NotifyKind, on: boolean) {
    const before = prefs;
    const next: NotifyPrefs = { ...prefs, [channel]: { ...prefs[channel], [kind]: on } };
    setPrefs(next);
    start(async () => {
      const r = await setNotifyPrefs(next).catch(() => ({ error: "failed" as const }));
      if (r.error) {
        setPrefs(before);
        toast.error(t(r.error === "not_ready" ? "notify_prefs_not_ready" : "notify_prefs_error"));
      }
    });
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th className="text-left font-normal" />
          <th className="w-16 font-normal">{t("notify_channel_push")}</th>
          <th className="w-16 font-normal">{t("notify_channel_email")}</th>
        </tr>
      </thead>
      <tbody>
        {NOTIFY_KINDS.map((kind) => (
          <tr key={kind}>
            <td className="py-1.5">{t(KIND_LABEL[kind])}</td>
            {(["push", "email"] as const).map((channel) => (
              <td key={channel} className="text-center">
                {channel === "email" && kind === "friends" ? null : (
                  <Checkbox
                    aria-label={`${t(KIND_LABEL[kind])} – ${t(channel === "push" ? "notify_channel_push" : "notify_channel_email")}`}
                    checked={wants(prefs, channel, kind)}
                    disabled={pending}
                    onCheckedChange={(v) => toggle(channel, kind, v === true)}
                  />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
