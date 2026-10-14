"use client";

import { useEffect, useState } from "react";

/** True only when this device actually has a camera the page may use:
 * a secure context (https/localhost) and at least one "videoinput" device.
 * enumerateDevices() lists device KINDS without asking permission (labels
 * stay empty until granted), so this never triggers a camera prompt.
 * Stays false while unknown, so camera UI is hidden by default. */
export function useHasCamera(): boolean {
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.isSecureContext || !navigator.mediaDevices?.enumerateDevices) return;
    let cancelled = false;
    const check = () =>
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => !cancelled && setHasCamera(devices.some((d) => d.kind === "videoinput")))
        .catch(() => !cancelled && setHasCamera(false));
    check();
    navigator.mediaDevices.addEventListener?.("devicechange", check);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener?.("devicechange", check);
    };
  }, []);

  return hasCamera;
}
