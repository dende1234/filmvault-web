"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { useLocalFlag } from "@/lib/use-local-flag";
import { Button } from "@/components/ui/button";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** "server" during SSR, else what this device is: installed already, an
 * iPhone/iPad (no install prompt, use Share → Add to Home Screen), another
 * phone, or a desktop (no card). */
function readPlatform(): "server" | "installed" | "ios" | "mobile" | "desktop" {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/android|mobile/i.test(ua)) return "mobile";
  return "desktop";
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Dashboard card on phones: put Filmory on your home screen. A real install
 * button where the browser offers one (Android/Chrome), the Share-menu steps
 * on iPhone. Hidden once installed or dismissed. */
export function InstallAppCard() {
  const { t } = useT();
  const platform = useSyncExternalStore(subscribe, readPlatform, () => "server" as const);
  const [dismissed, setDismissed] = useLocalFlag("fv_install_card_dismissed");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setDismissed(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [setDismissed]);

  if (dismissed || platform === "server" || platform === "installed" || platform === "desktop") return null;

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setDismissed(true);
    setPrompt(null);
  }

  return (
    <div className="relative flex items-start gap-3 rounded-card border border-primary/30 bg-primary/10 p-4">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-elevated hover:text-foreground"
        aria-label={t("install_dismiss")}
      >
        <X className="size-4" />
      </button>
      <Download className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-col gap-1.5 pr-6">
        <p className="font-medium">{t("install_title")}</p>
        {prompt ? (
          <>
            <p className="text-sm text-muted-foreground">{t("install_hint")}</p>
            <Button size="sm" className="w-fit" onClick={install}>
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
