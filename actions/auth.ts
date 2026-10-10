"use server";

import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { authErrorMessage } from "@/lib/auth-errors";

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const dict = getDictionary(await getLocale());
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error, dict, "login_error_fallback") };
  return { error: null };
}

/** `newsletterOptIn` travels as auth user metadata, because the profile row
 * doesn't exist yet at sign-up — getOrCreateProfile() copies it over when
 * it creates the profile on the first authenticated request. */
export async function signUp(email: string, password: string, newsletterOptIn = false): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const dict = getDictionary(await getLocale());
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { newsletter_opt_in: newsletterOptIn === true } },
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
