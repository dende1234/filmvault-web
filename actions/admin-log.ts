"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { isMissingError } from "@/lib/admin/migrations";

export type AdminLogEntry = {
  id: number;
  created_at: string;
  admin_id: string | null;
  admin_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
};

const PAGE = 100;

/** /admin/log, newest first. null = admin_log.sql hasn't run. */
export async function getAdminLog(filter: { action?: string | null; page?: number }): Promise<{ entries: AdminLogEntry[]; more: boolean } | null> {
  await requireAdmin();
  const supabase = await createClient();
  const page = Math.max(0, filter.page ?? 0);
  let query = supabase
    .from("admin_log")
    .select("id, created_at, admin_id, action, target_type, target_id, details")
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE);
  if (filter.action) query = query.eq("action", filter.action);
  const { data, error } = await query;
  if (isMissingError(error)) return null;
  if (error) throw error;
  const rows = (data ?? []) as Omit<AdminLogEntry, "admin_name">[];

  const ids = Array.from(new Set(rows.map((r) => r.admin_id).filter((x): x is string => !!x)));
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, name, email").in("id", ids) : { data: [] };
  const names = new Map(((profiles ?? []) as { id: string; name: string | null; email: string | null }[]).map((p) => [p.id, p.name || p.email]));
  return {
    entries: rows.slice(0, PAGE).map((r) => ({ ...r, admin_name: r.admin_id ? (names.get(r.admin_id) ?? null) : null })),
    more: rows.length > PAGE,
  };
}
