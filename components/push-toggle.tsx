"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { deletePushSubscription, savePushSubscription } from "@/actions/push";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** "Pushmeldingen op dit apparaat": per device. Hidden where the browser
 * can't (on iPhone only once Filmory is installed on the home screen) or
 * when push isn't configured. */
export function PushToggle() {
  const { t } = useT();
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!VAPID || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        setSupported(true);
        return reg.pushManager.getSubscription();
      })
      .then((sub) => setOn(!!sub))
      .catch(() => setSupported(false));
  }, []);

  if (!supported) return <p className="text-xs text-muted-foreground">{t("push_unsupported")}</p>;

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (next) {
        if ((await Notification.requestPermission()) !== "granted") {
          toast.error(t("push_denied"));
          return;
        }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID!) });
        const r = await savePushSubscription(JSON.parse(JSON.stringify(sub)), navigator.userAgent);
        if (r.error) {
          await sub.unsubscribe();
          toast.error(t(r.error === "not_ready" ? "push_not_ready" : "push_error"));
          return;
        }
        setOn(true);
        toast.success(t("push_on"));
      } else {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await deletePushSubscription(sub.endpoint);
          await sub.unsubscribe();
        }
        setOn(false);
        toast.success(t("push_off"));
      }
    } catch {
      toast.error(t("push_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-start gap-3">
      <Checkbox id="push-pref" checked={on} disabled={busy} onCheckedChange={(v) => toggle(v === true)} className="mt-0.5" />
      <Label htmlFor="push-pref" className="text-sm font-normal leading-snug">
        {t("push_label")}
      </Label>
    </div>
  );
}
