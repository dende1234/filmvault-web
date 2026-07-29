"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { format, type Dictionary, type Locale } from "./dictionary";

const LocaleContext = createContext<{ dict: Dictionary; locale: Locale } | null>(null);

/** Wraps the app once in the root layout with the server-resolved dictionary —
 * client islands read strings via useT() instead of re-deriving locale
 * themselves (locale is a stored preference, not a route, so there's nothing
 * to read from the URL client-side). */
export function LocaleProvider({
  dict,
  locale,
  children,
}: {
  dict: Dictionary;
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ dict, locale }), [dict, locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT() must be used within a LocaleProvider");
  const { dict, locale } = ctx;

  // Stable identity across renders (only changes when dict/locale actually
  // change) — a fresh function/object on every render would re-trigger any
  // useEffect that lists `t` in its dependency array, causing an infinite
  // render loop (hit for real: components/add-to-collection-dialog.tsx).
  const t = useCallback(
    (key: keyof Dictionary, ...args: Array<string | number>) => format(dict[key], ...args),
    [dict],
  );
  return useMemo(() => ({ t, locale }), [t, locale]);
}
