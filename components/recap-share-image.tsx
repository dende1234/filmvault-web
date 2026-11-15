"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImageDown } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";

/** "Filmory Wrapped": fetches the story image of this year's recap and opens
 * the phone's share sheet with it (Instagram, WhatsApp…), or downloads it
 * where sharing files isn't supported. The link carries ref=wrapped. */
export function RecapShareImage({ year, disabled }: { year: number; disabled?: boolean }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const res = await fetch(`/api/recap/image?year=${year}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const file = new File([blob], `filmory-${year}.png`, { type: "image/png" });
      const url = `${window.location.origin}/?ref=wrapped`;
      const text = t("wrapped_share_text", year);
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: `${text} ${url}` });
        } catch (e) {
          if ((e as DOMException).name !== "AbortError") throw e;
        }
      } else {
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(href);
        toast.success(t("wrapped_downloaded"));
      }
    } catch {
      toast.error(t("wrapped_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={share} disabled={busy || disabled}>
      <ImageDown />
      {busy ? t("wrapped_busy") : t("wrapped_button")}
    </Button>
  );
}
