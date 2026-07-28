import type { AuthError } from "@supabase/supabase-js";
import type { Dictionary } from "@/lib/i18n/dictionary";

/** Mirrors auth/AuthErrorMessages.kt — maps Supabase GoTrue's error codes to a
 * clear localized message instead of the raw exception text. */
export function authErrorMessage(error: AuthError | null, dict: Dictionary, fallbackKey: keyof Dictionary): string {
  const code = error?.code;
  switch (code) {
    case "invalid_credentials":
      return dict.auth_error_invalid_credentials;
    case "email_not_confirmed":
      return dict.auth_error_email_not_confirmed;
    case "user_not_found":
      return dict.auth_error_user_not_found;
    case "user_banned":
      return dict.auth_error_user_banned;
    case "email_exists":
    case "user_already_exists":
      return dict.auth_error_email_exists;
    case "weak_password":
      return dict.auth_error_weak_password;
    case "email_address_invalid":
      return dict.auth_error_invalid_email;
    case "over_email_send_rate_limit":
      return dict.auth_error_rate_limit;
    case "signup_disabled":
    case "email_provider_disabled":
      return dict.auth_error_signup_disabled;
    default:
      return dict[fallbackKey];
  }
}
