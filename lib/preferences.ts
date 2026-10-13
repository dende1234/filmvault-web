import { cookies, headers } from "next/headers";
import type { Locale } from "@/lib/i18n/dictionary";
import { detectLocale } from "@/lib/locale-detect";

export const THEME_COOKIE = "fv_theme";
export const LOCALE_COOKIE = "fv_locale";
/** First-party acquisition source (?ref= / ?utm_source=), set by the
 * middleware and recorded once on signup. */
export const SOURCE_COOKIE = "fv_src";

export type ThemePreference = "light" | "dark" | "system";

/** Server-side read of the stored theme preference — cookie first (works
 * pre-login too), same tri-state (system/light/dark) as Android's
 * `profiles.theme_preference`. No cookie yet = dark: the web app is
 * dark-first ("bioscoop-donker"); an explicit "system" choice is kept. */
export async function getThemePreference(): Promise<ThemePreference> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  if (value === "light" || value === "dark" || value === "system") return value;
  return "dark";
}

/** UI language: an explicit choice (fv_locale — set by the language switcher,
 * the profile, or on login from profiles.language) always wins. Otherwise
 * it's detected per request from the visitor's country (Vercel's
 * x-vercel-ip-country) and browser language — deliberately NOT persisted,
 * so a guess never masquerades as a choice. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;
  if (chosen === "nl" || chosen === "en") return chosen;
  const h = await headers();
  return detectLocale({
    country: h.get("x-vercel-ip-country"),
    acceptLanguage: h.get("accept-language"),
    userAgent: h.get("user-agent"),
  });
}
