/** Feature switches (feature_flags.sql). Pure rules, so testable; reading
 * the switches is in lib/features.ts. */

export type FeatureMode = "off" | "admins" | "users" | "percent" | "all";
export type FeatureFlag = { key: string; mode: FeatureMode; percent: number; user_ids: string[] };

/** Every feature that can be switched, with its default before an admin
 * touches it (or before the SQL has run). */
export const FEATURES = [{ key: "shelf_scan", defaultMode: "admins" }] as const satisfies readonly { key: string; defaultMode: FeatureMode }[];
export type FeatureKey = (typeof FEATURES)[number]["key"];

/** Stable 0–99 bucket per member and feature (FNV-1a), so a percentage
 * rollout keeps showing the feature to the same members. */
export function bucket(userId: string, key: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${key}:${userId}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 100;
}

/** Admins always get a feature unless it's off; chosen members always get
 * it in "users" and "percent" mode. */
export function featureEnabled(flag: FeatureFlag, userId: string | null, isAdmin: boolean): boolean {
  if (flag.mode === "off") return false;
  if (isAdmin) return true;
  if (!userId) return false;
  if (flag.mode === "all") return true;
  if (flag.mode === "users") return flag.user_ids.includes(userId);
  if (flag.mode === "percent") return flag.user_ids.includes(userId) || bucket(userId, flag.key) < flag.percent;
  return false;
}
