"use server";

// Newsletter sign-up for visitors without an account (double opt-in through
// Brevo, see lib/newsletter.ts) and the admin's one-off "sync to Brevo" for
// members who opted in before the sync existed. Visitors are not stored in
// Filmory's database: Brevo holds their address once they confirm.

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { ipHash } from "@/lib/ip-hash";
import { SITE_URL } from "@/lib/site";
import { isNewsletterConfigured, startDoubleOptIn, upsertMember } from "@/lib/newsletter";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MIN_FILL_MS = 2000;
const LIMIT_PER_HOUR = 3;

// Best effort per server instance; Brevo has its own limits behind this.
const recent = new Map<string, number[]>();

function rateLimited(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (hits.length >= LIMIT_PER_HOUR) return true;
  recent.set(key, [...hits, now]);
  if (recent.size > 5000) recent.clear();
  return false;
}

export type NewsletterSignupError = "email" | "rate" | "unavailable" | "generic";

export async function subscribeVisitor(input: {
  email: string;
  website?: string;
  openedAt?: number;
}): Promise<{ ok: true } | { ok: false; error: NewsletterSignupError }> {
  // Bots: pretend success, do nothing.
  if (input.website) return { ok: true };
  if (input.openedAt && Date.now() - input.openedAt < MIN_FILL_MS) return { ok: true };

  const email = input.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "email" };
  if (!isNewsletterConfigured()) return { ok: false, error: "unavailable" };
  if (rateLimited((await ipHash()) ?? "unknown")) return { ok: false, error: "rate" };

  const result = await startDoubleOptIn(email, `${SITE_URL}/nieuwsbrief/bevestigd`);
  if (result === "ok") return { ok: true };
  return { ok: false, error: result === "not_configured" ? "unavailable" : "generic" };
}

/** Pushes every member with newsletter_opt_in to the Brevo list. Safe to run
 * again: Brevo updates existing contacts. */
export async function adminSyncNewsletter(): Promise<{ synced: number; failed: number; configured: boolean }> {
  await requireAdmin();
  if (!isNewsletterConfigured()) return { synced: 0, failed: 0, configured: false };
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("email, name").eq("newsletter_opt_in", true);
  if (error) throw error;
  let synced = 0;
  let failed = 0;
  for (const row of data ?? []) {
    if (!row.email) continue;
    if ((await upsertMember(row.email, row.name)) === "ok") synced++;
    else failed++;
  }
  return { synced, failed, configured: true };
}
