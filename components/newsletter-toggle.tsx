"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { setNewsletterOptIn } from "@/actions/profile";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** E-mail consent on the profile page. Saves immediately (consent is its
 * own explicit act, separate from the profile's edit/save mode). */
export function NewsletterToggle({ initial }: { initial: boolean }) {
  const { t } = useT();
  const [checked, setChecked] = useState(initial);
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      const result = await setNewsletterOptIn(next);
      if (result.error) {
        setChecked(!next);
        toast.error(t("newsletter_opt_in_error"));
      } else {
        toast.success(t(next ? "newsletter_opt_in_on" : "newsletter_opt_in_off"));
      }
    });
  }

  return (
    <div className="flex items-start gap-3">
      <Checkbox id="newsletter-pref" checked={checked} disabled={isPending} onCheckedChange={(v) => toggle(v === true)} className="mt-0.5" />
      <Label htmlFor="newsletter-pref" className="text-sm font-normal leading-snug">
        {t("newsletter_opt_in_label")}
      </Label>
    </div>
  );
}
