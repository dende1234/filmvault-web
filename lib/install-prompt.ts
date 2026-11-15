"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Installing Filmory as an app (manifest: app/manifest.ts). Chrome/Edge fire
 * `beforeinstallprompt` once, early, whether or not an install button is on
 * screen; this module keeps that event so every install entry (dashboard
 * card, menu, profile) can use it later. iPhone/iPad and Safari never fire
 * it: there the dialog explains the Share-menu steps instead. */

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export type InstallPlatform = "server" | "installed" | "ios" | "android" | "desktop";

let deferred: InstallPrompt | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Our own buttons offer it; no browser mini-infobar on top.
    e.preventDefault();
    deferred = e as InstallPrompt;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    justInstalled = true;
    emit();
  });
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    mq.removeEventListener("change", onChange);
  };
}

function readPlatform(): InstallPlatform {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone || justInstalled) return "installed";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/android|mobile/i.test(ua)) return "android";
  return "desktop";
}

/** What this device is, whether the browser's own install dialog is ready,
 * and a function that opens it ("unavailable" when it isn't). */
export function useInstallApp() {
  const platform = useSyncExternalStore(subscribe, readPlatform, () => "server" as const);
  const canPrompt = useSyncExternalStore(subscribe, () => deferred !== null, () => false);
  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const event = deferred;
    if (!event) return "unavailable";
    await event.prompt();
    const { outcome } = await event.userChoice;
    // A prompt can only be used once; the browser fires a new one if allowed.
    deferred = null;
    emit();
    return outcome;
  }, []);
  return { platform, canPrompt, install };
}
