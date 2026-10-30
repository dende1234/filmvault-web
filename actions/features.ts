"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { logAdminAction } from "@/lib/admin/log";
import { isMissingError } from "@/lib/admin/migrations";
import { getFeatureFlags } from "@/lib/features";
import { FEATURES, type FeatureFlag, type FeatureKey, type FeatureMode } from "@/lib/feature-rules";

export type AdminFeature = FeatureFlag & { emails: string[] };

/** /admin/features: every switch, with the e-mail addresses of chosen members. */
export async function getAdminFeatures(): Promise<AdminFeature[]> {
  await requireAdmin();
  const supabase = await createClient();
  const flags = await getFeatureFlags();
  const ids = Array.from(new Set(flags.flatMap((f) => f.user_ids)));
  const { data } = ids.length ? await supabase.from("profiles").select("id, email").in("id", ids) : { data: [] };
  const byId = new Map(((data ?? []) as { id: string; email: string | null }[]).map((p) => [p.id, p.email ?? p.id]));
  return flags.map((f) => ({ ...f, emails: f.user_ids.map((id) => byId.get(id) ?? id) }));
}

const MODES: FeatureMode[] = ["off", "admins", "users", "percent", "all"];

export async function saveFeature(input: { key: FeatureKey; mode: FeatureMode; percent: number; emails: string[] }): Promise<{ error: "not_ready" | "invalid" | null; unknown?: string[] }> {
  await requireAdmin();
  if (!FEATURES.some((f) => f.key === input.key) || !MODES.includes(input.mode)) return { error: "invalid" };
  const supabase = await createClient();
  const emails = Array.from(new Set(input.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))).slice(0, 200);
  const { data } = emails.length ? await supabase.from("profiles").select("id, email").in("email", emails) : { data: [] };
  const found = (data ?? []) as { id: string; email: string }[];
  const unknown = emails.filter((e) => !found.some((f) => f.email?.toLowerCase() === e));
  const percent = Math.max(0, Math.min(100, Math.round(input.percent || 0)));
  const { error } = await supabase
    .from("feature_flags")
    .upsert({ key: input.key, mode: input.mode, percent, user_ids: found.map((f) => f.id), updated_at: new Date().toISOString() });
  if (isMissingError(error)) return { error: "not_ready" };
  if (error) throw error;
  await logAdminAction("feature_change", { type: "feature", id: input.key }, { mode: input.mode, percent, members: found.length });
  revalidatePath("/", "layout");
  return { error: null, unknown };
}
