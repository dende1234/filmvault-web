"use client";

import { useEffect } from "react";
import { reportClientError } from "@/actions/errors";

const MAX_PER_PAGE = 5;

/** Sends uncaught browser errors to app_errors (at most a few per page
 * load). Mounted once in the root layout. */
export function ErrorReporter() {
  useEffect(() => {
    let sent = 0;
    const send = (message: string) => {
      if (!message || sent >= MAX_PER_PAGE) return;
      // Noise from browser extensions and aborted loads.
      if (/ResizeObserver loop|chrome-extension:|moz-extension:|Load failed|NetworkError|Failed to fetch/i.test(message)) return;
      sent++;
      reportClientError({ message, path: location.pathname, userAgent: navigator.userAgent }).catch(() => {});
    };
    const onError = (e: ErrorEvent) => send(e.error?.stack ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => send(e.reason instanceof Error ? (e.reason.stack ?? e.reason.message) : String(e.reason));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
