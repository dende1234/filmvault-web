/** Per-kind notification choices (notification_prefs.sql): profiles.notify_prefs
 * = { push: { barcode: false }, email: { loan: false } }. Missing = yes.
 * "news" = announcements from the Filmory team (announcements.sql). */

export const NOTIFY_KINDS = ["barcode", "friends", "loan", "news"] as const;
export type NotifyKind = (typeof NOTIFY_KINDS)[number];
export type NotifyChannel = "push" | "email";
export type NotifyPrefs = Partial<Record<NotifyChannel, Partial<Record<NotifyKind, boolean>>>>;

export function wants(prefs: NotifyPrefs | null | undefined, channel: NotifyChannel, kind: NotifyKind): boolean {
  return prefs?.[channel]?.[kind] !== false;
}

/** user_notifications.kind → our kind. */
export function kindOfNotification(kind: string): NotifyKind | null {
  if (kind === "barcode_approved" || kind === "barcode_rejected") return "barcode";
  if (kind === "loan_reminder") return "loan";
  if (kind === "announcement") return "news";
  if (kind.startsWith("friend")) return "friends";
  return null;
}
