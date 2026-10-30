"use server";

// /admin/status: which migrations have run and which settings are present.
// Only reads; setting values never leave the server, only "present or not".

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/require-admin";
import { MIGRATIONS, isMissingError, type MigrationProbe } from "@/lib/admin/migrations";

export type ProbeState = "ok" | "missing" | "unknown";
export type MigrationStatus = { file: string; state: ProbeState; note?: string; detail?: string };
export type SettingStatus = { name: string; present: boolean; required: boolean };

async function probe(supabase: Awaited<ReturnType<typeof createClient>>, p: MigrationProbe): Promise<{ state: ProbeState; detail?: string }> {
  const { error } =
    p.kind === "rpc"
      ? await supabase.rpc(p.fn, p.args ?? {})
      : await supabase.from(p.table).select(p.kind === "column" ? p.column : "*", { head: true }).limit(0);
  if (!error) return { state: "ok" };
  if (isMissingError(error)) return { state: "missing" };
  return { state: "unknown", detail: error.code ?? error.message };
}

export async function getSystemStatus(): Promise<{ migrations: MigrationStatus[]; settings: SettingStatus[] }> {
  await requireAdmin();
  const supabase = await createClient();
  const migrations = await Promise.all(
    MIGRATIONS.map(async (m) => (m.probe ? { file: m.file, ...(await probe(supabase, m.probe)) } : { file: m.file, state: "unknown" as const, note: m.note })),
  );

  const env = (name: string, required = false): SettingStatus => ({ name, present: !!process.env[name], required });
  const settings = [
    env("NEXT_PUBLIC_SUPABASE_URL", true),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY", true),
    env("TMDB_API_KEY", true),
    env("NEXT_PUBLIC_SITE_URL"),
    env("FEEDBACK_SALT"),
    env("BREVO_API_KEY"),
    env("BREVO_LIST_ID"),
    env("BREVO_DOI_TEMPLATE_ID"),
    env("ANTHROPIC_API_KEY"),
    env("BREVO_SENDER_EMAIL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    env("CRON_SECRET"),
    env("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    env("VAPID_PRIVATE_KEY"),
  ];
  return { migrations, settings };
}

export type RlsRow = { table_name: string; rls_enabled: boolean; policies: number };

/** Tables in the public schema and their RLS state (rls_report.sql); null
 * before that file has run. */
export async function getRlsReport(): Promise<RlsRow[] | null> {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_rls_report");
  if (error) return null;
  return data as RlsRow[];
}
