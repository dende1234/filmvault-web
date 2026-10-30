"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Shares (or copies) a personal invite link. The `?ref=invite-…` source is
 * picked up by the proxy's fv_src cookie and recorded on signup, so
 * invites show up as their own source in the growth stats. */
export function InviteButton({ url, variant = "secondary", size }: { url: string; variant?: ButtonProps["variant"]; size?: ButtonProps["size"] }) {
  const { t } = useT();

  async function share() {
    const text = t("invite_share_text");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Filmory", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success(t("invite_copied"));
    } catch (e) {
      // AbortError = the viewer closed the share sheet; nothing to report.
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.error(t("invite_copied_failed"));
    }
  }

  return (
    <Button variant={variant} size={size} onClick={share}>
      <Share2 />
      {t("invite_button")}
    </Button>
  );
}
