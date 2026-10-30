import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { FEATURES, featureEnabled, type FeatureFlag, type FeatureKey } from "@/lib/feature-rules";

/** All switches, once per request; defaults for missing rows (or before
 * feature_flags.sql has run). */
export const getFeatureFlags = cache(async (): Promise<FeatureFlag[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("feature_flags").select("key, mode, percent, user_ids");
  const rows = error ? [] : ((data ?? []) as FeatureFlag[]);
  return FEATURES.map((f) => rows.find((r) => r.key === f.key) ?? { key: f.key, mode: f.defaultMode, percent: 0, user_ids: [] });
});

/** Is this feature on for the signed-in member? */
export async function featureOn(key: FeatureKey): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const [flags, { data: profile }] = await Promise.all([getFeatureFlags(), supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle()]);
  const flag = flags.find((f) => f.key === key)!;
  return featureEnabled(flag, user.id, !!profile?.is_admin);
}
