/** Who an announcement goes to (announcements.sql). */
export const AUDIENCES = ["all", "nl", "en", "contributors", "admins"] as const;
export type Audience = (typeof AUDIENCES)[number];

export function isAudience(v: unknown): v is Audience {
  return typeof v === "string" && (AUDIENCES as readonly string[]).includes(v);
}

/** Today's date (yyyy-mm-dd) in the Netherlands, where the cron's "daily" is meant. */
export function todayNL(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(now);
}
