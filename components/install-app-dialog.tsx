"use client";

import { useState } from "react";
import { CheckCircle2, Download, Share } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { useInstallApp } from "@/lib/install-prompt";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Always-available way to install Filmory: the browser's install dialog
 * where it's ready, otherwise the steps for this device. */
export function InstallAppDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useT();
  const { platform, canPrompt, install } = useInstallApp();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("install_title")}</DialogTitle>
          <DialogDescription>{t("install_hint")}</DialogDescription>
        </DialogHeader>
        {platform === "installed" ? (
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-success" aria-hidden />
            {t("install_already")}
          </p>
        ) : canPrompt ? (
          <Button
            className="w-fit"
            onClick={async () => {
              if ((await install()) === "accepted") onOpenChange(false);
            }}
          >
            <Download className="size-4" aria-hidden />
            {t("install_button")}
          </Button>
        ) : platform === "ios" ? (
          <p className="text-sm">
            {t("install_ios_before")} <Share className="inline size-4 align-text-bottom" aria-label={t("install_share_icon")} />{" "}
            {t("install_ios_after")}
          </p>
        ) : platform === "android" ? (
          <p className="text-sm">{t("install_other")}</p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <p>{t("install_desktop_chrome")}</p>
            <p>{t("install_desktop_safari")}</p>
            <p className="text-muted-foreground">{t("install_desktop_phone")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** A button that opens the dialog (profile page). Hidden once installed. */
export function InstallAppButton() {
  const { t } = useT();
  const { platform } = useInstallApp();
  const [open, setOpen] = useState(false);
  if (platform === "installed") return <p className="text-sm text-muted-foreground">{t("install_already")}</p>;
  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Download className="size-4" aria-hidden />
        {t("install_menu")}
      </Button>
      <InstallAppDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
