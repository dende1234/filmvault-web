import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AdminAction =
  | "barcode_approve"
  | "barcode_approve_with_changes"
  | "box_approve"
  | "barcode_reject"
  | "barcode_restore"
  | "barcode_register"
  | "barcode_update"
  | "barcode_delete"
  | "barcode_move"
  | "user_admin_on"
  | "user_admin_off"
  | "user_delete"
  | "announcement_send"
  | "help_answer_save"
  | "help_answer_delete";

/** Adds an entry to /admin/log (admin_log.sql). Never fails the action it
 * records: before the table exists, or on any error, it only logs to the
 * server console. Call it after the action succeeded. */
export async function logAdminAction(action: AdminAction, target?: { type: string; id: string }, details: Record<string, unknown> = {}) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("admin_log").insert({
      action,
      target_type: target?.type ?? null,
      target_id: target?.id?.slice(0, 200) ?? null,
      details,
    });
    if (error && !["PGRST205", "42P01"].includes(error.code ?? "")) console.error("admin_log", error);
  } catch (e) {
    console.error("admin_log", e);
  }
}
