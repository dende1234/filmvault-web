"use client";

import { toast } from "sonner";
import { Download, Share, X } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { useLocalFlag } from "@/lib/use-local-flag";
import { useInstallApp } from "@/lib/install-prompt";
import { Button } from "@/components/ui/button";

/** Dashboard card on phones: put Filmory on your home screen. A real install
 * button where the browser offers one (Android/Chrome), the Share-menu steps
 * on iPhone. Hidden once installed or dismissed; installing stays possible
 * any time via the menu (Meer → App installeren) and the profile page. */
export function InstallAppCard() {
  const { t } = useT();
  const { platform, canPrompt, install } = useInstallApp();
  const [dismissed, setDismissed] = useLocalFlag("fv_install_card_dismissed");

  if (dismissed || platform === "server" || platform === "installed" || platform === "desktop") return null;

  return (
    <div className="relative flex items-start gap-3 rounded-card border border-primary/30 bg-primary/10 p-4">
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          toast(t("install_later"));
        }}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-elevated hover:text-foreground"
        aria-label={t("install_dismiss")}
      >
        <X className="size-4" />
      </button>
      <Download className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-col gap-1.5 pr-6">
        <p className="font-medium">{t("install_title")}</p>
        {canPrompt ? (
          <>
            <p className="text-sm text-muted-foreground">{t("install_hint")}</p>
            <Button
              size="sm"
              className="w-fit"
              onClick={async () => {
                if ((await install()) === "accepted") setDismissed(true);
              }}
            >
              {t("install_button")}
            </Button>
          </>
        ) : platform === "ios" ? (
          <p className="text-sm text-muted-foreground">
            {t("install_ios_before")} <Share className="inline size-4 align-text-bottom" aria-label={t("install_share_icon")} />{" "}
            {t("install_ios_after")}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("install_other")}</p>
        )}
      </div>
    </div>
  );
}
