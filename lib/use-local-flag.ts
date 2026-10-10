"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function read(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** A per-viewer boolean in localStorage (e.g. "checklist dismissed").
 * Server render and first client render both see `false`, so there's no
 * hydration mismatch; storage failures (private mode) just mean "not set". */
export function useLocalFlag(key: string): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => read(key),
    () => false,
  );
  const set = useCallback(
    (next: boolean) => {
      try {
        if (next) window.localStorage.setItem(key, "1");
        else window.localStorage.removeItem(key);
      } catch {
        // Convenience only — ignore blocked storage.
      }
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}
