"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeMember, upsertMember } from "@/lib/newsletter";
import { THEME_COOKIE, LOCALE_COOKIE, SOURCE_COOKIE, type ThemePreference } from "@/lib/preferences";
import type { Locale } from "@/lib/i18n/dictionary";
import type { Profile, PublicProfile } from "@/types/database";

/** Mirrors ProfileRepository.getOrCreateProfile — selects the caller's own
 * row, inserting a bare one on first login (Supabase Auth already created
 * the auth.users row; this app's `profiles` row is created lazily).
 *
 * Race-safe by design: this is called independently from `(app)/layout.tsx`
 * (for the nav avatar) AND from whichever page is rendering underneath it —
 * on a brand-new account's very first authenticated request, both calls run
 * concurrently, see no existing row, and both attempt the insert. One wins;
 * the other gets a unique-constraint conflict on `id`. Falling through to a
 * re-select on any insert error (instead of returning null) resolves that
 * race instead of silently rendering an empty page — hit for real during
 * this round's smoke testing, not a hypothetical. */
export async function getOrCreateProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (existing) return existing as Profile;

  // `name` is NOT NULL with no column default on the live schema — must be
  // supplied explicitly (found via this round's smoke testing: omitting it
  // failed every fresh registration with a 23502 not-null-violation).
  const chosenLanguage = user.user_metadata?.language;
  const base = {
    id: user.id,
    email: user.email,
    name: "",
    ...(chosenLanguage === "nl" || chosenLanguage === "en" ? { language: chosenLanguage } : {}),
  };
  const optedIn = user.user_metadata?.newsletter_opt_in === true;
  const consent = optedIn ? { newsletter_opt_in: true, newsletter_opt_in_at: new Date().toISOString() } : {};
  let { data: created, error } = await supabase.from("profiles").insert({ ...base, ...consent }).select("*").single();
  // PGRST204 = unknown column: growth_tracking.sql hasn't run yet. Never let
  // that block a registration — create the profile without the consent.
  if (error?.code === "PGRST204" && optedIn) {
    ({ data: created, error } = await supabase.from("profiles").insert(base).select("*").single());
  }
  if (!error) {
    await logSignupEvent(user.id);
    // Ticked the newsletter box at sign-up: put them on the Brevo list after
    // the response, so the mailing service can never slow down or break sign-up.
    if (optedIn && user.email && (created as Profile | null)?.newsletter_opt_in) {
      const email = user.email;
      after(() => upsertMember(email));
    }
    return created as Profile;
  }

  const { data: afterRace } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (afterRace as Profile) ?? null;
}

/** Best-effort "signup" growth event with the first-party source cookie set
 * by the middleware (?ref= / ?utm_source=). Failures are swallowed: metrics
 * must never break sign-up (e.g. before growth_tracking.sql has run). */
async function logSignupEvent(userId: string) {
  try {
    const store = await cookies();
    const source = store.get(SOURCE_COOKIE)?.value || "direct";
    const supabase = await createClient();
    await supabase.from("app_events").insert({ user_id: userId, event: "signup", source });
  } catch {
    // ignore
  }
}

/** Explicit e-mail consent toggle (profile page). Stores when it was given. */
export async function setNewsletterOptIn(optIn: boolean): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };
  const { error } = await supabase
    .from("profiles")
    .update({ newsletter_opt_in: optIn, newsletter_opt_in_at: optIn ? new Date().toISOString() : null })
    .eq("id", user.id);
  if (!error && user.email) {
    const email = user.email;
    after(async () => {
      if (!optIn) {
        await removeMember(email);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
      await upsertMember(email, profile?.name);
    });
  }
  revalidatePath("/profile");
  return { error: error?.message ?? null };
}

export async function updateProfile(update: {
  name: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  avatar_url: string | null;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not authenticated" };

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  revalidatePath("/profile");
  return { error: error?.message ?? null };
}

/** Persists the theme choice both as a cookie (read on every SSR request, see
 * lib/preferences.ts) and on the profile row (so it's remembered cross-device,
 * matching Android's `profiles.theme_preference`). */
export async function setThemePreference(theme: ThemePreference): Promise<void> {
  const store = await cookies();
  store.set(THEME_COOKIE, theme, { maxAge: 60 * 60 * 24 * 365, path: "/" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ theme_preference: theme }).eq("id", user.id);

  revalidatePath("/", "layout");
}

export async function setLocale(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ language: locale }).eq("id", user.id);

  revalidatePath("/", "layout");
}

/** Safe, public read of another user's profile (bio/location/website
 * included, but never email/is_admin/theme_preference/language) — used by
 * the public profile page. Same RPC the Android app calls. */
export async function getPublicProfileDetails(userId: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_profile_details", { target_user_id: userId });
  if (error) throw error;
  return (data as PublicProfile[])[0] ?? null;
}

/** Invokes the existing delete-account Edge Function — unchanged from the
 * Android app, including this session's fix that also clears posts/follows/
 * curated_lists/push_tokens/content_reports before deleting the auth user. */
export async function deleteAccount(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("delete-account");
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  return { error: null };
}
