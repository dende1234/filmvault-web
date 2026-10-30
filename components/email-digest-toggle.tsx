"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { setEmailDigest } from "@/actions/profile";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** Weekly e-mail summary of notifications; off by default. */
export function EmailDigestToggle({ initial }: { initial: boolean }) {
  const { t } = useT();
  const [checked, setChecked] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id="digest-pref"
        checked={checked}
        disabled={pending}
        className="mt-0.5"
        onCheckedChange={(v) => {
          const next = v === true;
          setChecked(next);
          start(async () => {
            const r = await setEmailDigest(next).catch(() => ({ error: "failed" as const }));
            if (r.error) {
              setChecked(!next);
              toast.error(t(r.error === "not_ready" ? "digest_not_ready" : "digest_error"));
            } else toast.success(t(next ? "digest_on" : "digest_off"));
          });
        }}
      />
      <Label htmlFor="digest-pref" className="text-sm font-normal leading-snug">
        {t("digest_label")}
      </Label>
    </div>
  );
}
