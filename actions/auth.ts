"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale, LOCALE_COOKIE } from "@/lib/preferences";
import { authErrorMessage } from "@/lib/auth-errors";

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const dict = getDictionary(await getLocale());
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error, dict, "login_error_fallback") };

  // The language set on the profile (web or Android) follows the user to
  // this device. No profile language = keep the current choice/detection.
  const { data: profile } = await supabase.from("profiles").select("language").eq("id", data.user.id).maybeSingle();
  if (profile?.language === "nl" || profile?.language === "en") {
    const store = await cookies();
    store.set(LOCALE_COOKIE, profile.language, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  return { error: null };
}

/** `newsletterOptIn` travels as auth user metadata, because the profile row
 * doesn't exist yet at sign-up — getOrCreateProfile() copies it over when
 * it creates the profile on the first authenticated request. */
export async function signUp(email: string, password: string, newsletterOptIn = false): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const dict = getDictionary(await getLocale());
  // A language the visitor explicitly picked as a guest becomes the profile
  // language (copied over in getOrCreateProfile). A detected one does not.
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  const language = chosen === "nl" || chosen === "en" ? chosen : undefined;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { newsletter_opt_in: newsletterOptIn === true, ...(language ? { language } : {}) } },
  });
  if (error) return { error: authErrorMessage(error, dict, "register_error_fallback") };
  return { error: null };
}

export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const dict = getDictionary(await getLocale());
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { error: authErrorMessage(error, dict, "forgot_password_error_fallback") };
  return { error: null };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
