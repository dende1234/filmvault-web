import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingError } from "@/lib/admin/migrations";

/** Limits per signed-in member (rate_limits.sql). Window is a day for
 * paid/expensive work, an hour for the rest. */
export const LIMITS = {
  shelf_scan: { limit: 30, windowSeconds: 24 * 3600 },
  import_match: { limit: 200, windowSeconds: 3600 },
  barcode_suggest: { limit: 120, windowSeconds: 3600 },
} as const;

export type LimitKey = keyof typeof LIMITS;

/** true = go ahead (and the attempt is counted). Before the SQL has run, or
 * if the check itself fails, it lets the action through: a limit must
 * never block normal use because of a database hiccup. */
export async function withinLimit(key: LimitKey): Promise<boolean> {
  const { limit, windowSeconds } = LIMITS[key];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("hit_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) {
      if (!isMissingError(error)) console.error("hit_rate_limit", error);
      return true;
    }
    return data !== false;
  } catch {
    return true;
  }
}
