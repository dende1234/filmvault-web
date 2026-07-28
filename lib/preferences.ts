import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n/dictionary";

export const THEME_COOKIE = "fv_theme";
export const LOCALE_COOKIE = "fv_locale";

export type ThemePreference = "light" | "dark" | "system";

/** Server-side read of the stored theme preference — cookie first (works
 * pre-login too), same tri-state (system/light/dark) as Android's
 * `profiles.theme_preference`. */
export async function getThemePreference(): Promise<ThemePreference> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === "light" || value === "dark" ? value : "system";
}

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "en" ? "en" : "nl";
}
