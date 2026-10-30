"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { setTrusted } from "@/actions/admin";
import { Checkbox } from "@/components/ui/checkbox";

/** /admin/users/<id>: approve this member's submissions automatically. */
export function TrustedToggle({ userId, initial }: { userId: string; initial: boolean }) {
  const { t } = useT();
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3 text-sm">
      <Checkbox
        checked={on}
        disabled={pending}
        className="mt-0.5"
        onCheckedChange={(v) => {
          const next = v === true;
          setOn(next);
          start(async () => {
            try {
              await setTrusted(userId, next);
            } catch {
              setOn(!next);
              toast.error(t("admin_trusted_error"));
            }
          });
        }}
      />
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{t("admin_trusted_label")}</span>
        <span className="text-xs text-muted-foreground">{t("admin_trusted_hint")}</span>
      </span>
    </label>
  );
}
