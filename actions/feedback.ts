"use server";

// Bug reports and ideas from users and visitors without an account
// (FilmVault/supabase/sql/user_feedback.sql). Inserts go through the
// submit_feedback() RPC, which validates and rate-limits; this action adds
// the server-only parts: a salted IP hash for the visitor limit, the app
// version, and two cheap bot checks (honeypot + minimum fill time).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { ipHash } from "@/lib/ip-hash";
import { FEEDBACK_BUCKET, FEEDBACK_KINDS as KINDS, FEEDBACK_STATUSES as STATUSES } from "@/lib/feedback";
import type { FeedbackKind, FeedbackStatus, UserFeedback } from "@/types/database";

const MIN_FILL_MS = 3000;
const COLUMNS =
  "id, created_at, updated_at, user_id, kind, message, contact_email, page, user_agent, viewport, locale, app_version, screenshot_path, status, admin_reply";

export type FeedbackError = "message" | "email" | "rate" | "screenshot" | "unavailable" | "generic";

export type FeedbackInput = {
  kind: FeedbackKind;
  message: string;
  contactEmail?: string | null;
  page?: string | null;
  userAgent?: string | null;
  viewport?: string | null;
  locale?: string | null;
  screenshotPath?: string | null;
  /** Honeypot: a hidden field real people leave empty. */
  website?: string;
  /** Date.now() when the form opened; a bot posts instantly. */
  openedAt?: number;
};

/** Table/function not created yet (user_feedback.sql not run). */
function isMissing(error: { code?: string } | null) {
  return !!error && ["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code ?? "");
}

export async function submitFeedback(input: FeedbackInput): Promise<{ ok: true } | { ok: false; error: FeedbackError }> {
  // Bots: pretend success so they don't retry, but store nothing.
  if (input.website) return { ok: true };
  if (input.openedAt && Date.now() - input.openedAt < MIN_FILL_MS) return { ok: true };

  const message = input.message?.trim() ?? "";
  if (!KINDS.includes(input.kind)) return { ok: false, error: "generic" };
  if (message.length < 5 || message.length > 4000) return { ok: false, error: "message" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_feedback", {
    p_kind: input.kind,
    p_message: message,
    p_contact_email: input.contactEmail?.trim() || null,
    p_page: input.page?.slice(0, 300) || null,
    p_user_agent: input.userAgent?.slice(0, 500) || null,
    p_viewport: input.viewport?.slice(0, 20) || null,
    p_locale: input.locale?.slice(0, 5) || null,
    p_app_version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    p_screenshot_path: input.screenshotPath || null,
    p_ip_hash: await ipHash(),
  });
  if (!error) {
    revalidatePath("/my-feedback");
    return { ok: true };
  }
  if (isMissing(error)) return { ok: false, error: "unavailable" };
  const msg = error.message ?? "";
  if (msg.includes("rate_limited")) return { ok: false, error: "rate" };
  if (msg.includes("invalid_email")) return { ok: false, error: "email" };
  if (msg.includes("invalid_message")) return { ok: false, error: "message" };
  if (msg.includes("invalid_screenshot")) return { ok: false, error: "screenshot" };
  return { ok: false, error: "generic" };
}

/** The signed-in user's own feedback, newest first. null = not set up yet. */
export async function getMyFeedback(): Promise<UserFeedback[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("user_feedback")
    .select(COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (isMissing(error)) return null;
  if (error) throw error;
  return data as UserFeedback[];
}

export type AdminFeedbackItem = UserFeedback & {
  reporter: { id: string; name: string | null; email: string | null } | null;
};

/** Admin inbox. status "open" = new + in progress + planned. null = not set up yet. */
export async function getFeedbackList(filter: {
  status: "open" | "all" | FeedbackStatus;
  kind: "all" | FeedbackKind;
}): Promise<AdminFeedbackItem[] | null> {
  await requireAdmin();
  const supabase = await createClient();
  let query = supabase.from("user_feedback").select(COLUMNS).order("created_at", { ascending: false }).limit(200);
  if (filter.status === "open") query = query.in("status", ["new", "in_progress", "planned"]);
  else if (filter.status !== "all") query = query.eq("status", filter.status);
  if (filter.kind !== "all") query = query.eq("kind", filter.kind);
  const { data, error } = await query;
  if (isMissing(error)) return null;
  if (error) throw error;

  const rows = data as UserFeedback[];
  const ids = Array.from(new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id)));
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, name, email").in("id", ids)
    : { data: [] as { id: string; name: string | null; email: string | null }[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, reporter: r.user_id ? (byId.get(r.user_id) ?? { id: r.user_id, name: null, email: null }) : null }));
}

export async function updateFeedback(
  id: string,
  changes: { status: FeedbackStatus; adminReply: string | null },
): Promise<{ error: string | null }> {
  await requireAdmin();
  if (!STATUSES.includes(changes.status)) return { error: "invalid_status" };
  const reply = changes.adminReply?.trim() || null;
  if (reply && reply.length > 2000) return { error: "reply_too_long" };
  const supabase = await createClient();
  const { error } = await supabase.from("user_feedback").update({ status: changes.status, admin_reply: reply }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/feedback");
  revalidatePath("/my-feedback");
  revalidatePath("/", "layout"); // the badge count in the admin menu
  return { error: null };
}

/** Short-lived link to a screenshot in the private bucket (admins only). */
export async function getFeedbackScreenshotUrl(path: string): Promise<string | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.storage.from(FEEDBACK_BUCKET).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

/** Number of new (unread) items for the admin menu badge; 0 when not an
 * admin or not set up yet, so the layout never breaks on it. */
export async function getNewFeedbackCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_feedback_new_count");
  if (error) return 0;
  return typeof data === "number" ? data : 0;
}
