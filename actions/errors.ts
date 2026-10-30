"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { reportError } from "@/lib/report-error";
import { isMissingError } from "@/lib/admin/migrations";

/** From the browser (error boundary, window.onerror). */
export async function reportClientError(input: { message: string; digest?: string | null; path?: string | null; userAgent?: string | null }) {
  if (!input.message?.trim()) return;
  const supabase = await createClient();
  await reportError({ source: "client", message: input.message, digest: input.digest, path: input.path?.split("?")[0], userAgent: input.userAgent }, supabase);
}

export type AppErrorRow = {
  id: number;
  created_at: string;
  source: "server" | "client";
  message: string;
  digest: string | null;
  path: string | null;
  context: string | null;
  user_agent: string | null;
  user_id: string | null;
};

/** /admin/status: the latest errors. null = app_errors.sql hasn't run. */
export async function getRecentErrors(limit = 50): Promise<AppErrorRow[] | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_errors").select("*").order("created_at", { ascending: false }).limit(limit);
  if (isMissingError(error)) return null;
  if (error) throw error;
  return (data ?? []) as AppErrorRow[];
}
