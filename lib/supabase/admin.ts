import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role client for background jobs without a signed-in member (the
 * weekly digest). Bypasses RLS: only use it in code that decides itself
 * whose data it touches. null when SUPABASE_SERVICE_ROLE_KEY isn't set. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
