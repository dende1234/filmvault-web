import { createClient as createPlainClient } from "@supabase/supabase-js";

export type ErrorReport = { source: "server" | "client"; message: string; digest?: string | null; path?: string | null; context?: string | null; userAgent?: string | null };

/** Stores an error via log_app_error() (app_errors.sql). Never throws: an
 * error while reporting an error is only logged to the console. Without a
 * client (e.g. in instrumentation.ts) a cookie-less anon client is used. */
export async function reportError(
  r: ErrorReport,
  client?: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: unknown }> },
) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!client && (!url || !key)) return;
    const supabase = client ?? createPlainClient(url!, key!, { auth: { persistSession: false } });
    const { error } = await supabase.rpc("log_app_error", {
      p_source: r.source,
      p_message: r.message.slice(0, 1000),
      p_digest: r.digest ?? null,
      p_path: r.path?.slice(0, 300) ?? null,
      p_context: r.context?.slice(0, 300) ?? null,
      p_user_agent: r.userAgent?.slice(0, 300) ?? null,
    });
    if (error) console.error("log_app_error", error);
  } catch (e) {
    console.error("reportError", e);
  }
}
