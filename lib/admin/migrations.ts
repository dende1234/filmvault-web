/** Every SQL migration the web app relies on, with a cheap probe that tells
 * whether it has run (/admin/status). Order = the order to run them in.
 * Probes only read: a select of the column with limit 0, or a read-only RPC.
 * Migrations that only add policies, indexes or triggers can't be seen from
 * the API; they are listed with probe null. New migrations live in this
 * repo's supabase/sql/ (copy them to FilmVault/supabase/sql/ as well). */

export type MigrationProbe =
  | { kind: "table"; table: string }
  | { kind: "column"; table: string; column: string }
  | { kind: "rpc"; fn: string; args?: Record<string, unknown> };

export type Migration = { file: string; probe: MigrationProbe | null; note?: string };

export const MIGRATIONS: Migration[] = [
  { file: "shared_film_across_collections.sql", probe: { kind: "column", table: "collection_items", column: "item_group_id" } },
  { file: "wishlist.sql", probe: { kind: "table", table: "wishlist_items" } },
  { file: "curated_lists.sql", probe: { kind: "table", table: "curated_lists" } },
  { file: "social_feed.sql", probe: { kind: "table", table: "posts" } },
  { file: "friends_and_badges_policies.sql", probe: null, note: "policies" },
  { file: "user_badges_public_read.sql", probe: null, note: "policies" },
  { file: "admin_tools.sql", probe: null, note: "policies" },
  { file: "barcodes_unique.sql", probe: null, note: "index" },
  { file: "media_types_and_edities.sql", probe: { kind: "table", table: "media_types" } },
  { file: "public_collections.sql", probe: { kind: "column", table: "collections", column: "is_public" } },
  { file: "public_collection_boxes.sql", probe: null, note: "function" },
  { file: "watched_films.sql", probe: { kind: "table", table: "film_logs" } },
  { file: "series_support.sql", probe: { kind: "column", table: "collection_items", column: "seasons" } },
  { file: "custom_covers.sql", probe: { kind: "column", table: "collection_items", column: "custom_cover_path" } },
  { file: "user_feedback.sql", probe: { kind: "table", table: "user_feedback" } },
  { file: "growth_tracking.sql", probe: { kind: "column", table: "profiles", column: "newsletter_opt_in" } },
  { file: "copy_details.sql", probe: { kind: "column", table: "collection_items", column: "cut" } },
  { file: "collector_extras.sql", probe: { kind: "column", table: "wishlist_items", column: "is_grail" } },
  { file: "contributors_region.sql", probe: { kind: "column", table: "collection_items", column: "region" } },
  { file: "help_questions.sql", probe: { kind: "table", table: "help_questions" } },
  { file: "approval_notifications.sql", probe: { kind: "rpc", fn: "my_pending_submissions" } },
  { file: "invite_rewards.sql", probe: { kind: "rpc", fn: "my_invite_count" } },
  // This round (supabase/sql/ in this repo).
  { file: "approve_pending.sql", probe: { kind: "rpc", fn: "approve_pending_ready" } },
  { file: "dashboard_stats.sql", probe: { kind: "rpc", fn: "dashboard_stats", args: { p_recent: 1 } } },
  { file: "purchase_details.sql", probe: { kind: "column", table: "collection_items", column: "purchase_price" } },
  { file: "loan_reminders.sql", probe: { kind: "column", table: "collection_items", column: "loan_reminded_at" } },
  { file: "public_wishlist.sql", probe: { kind: "column", table: "profiles", column: "wishlist_public" } },
  { file: "help_answers.sql", probe: { kind: "table", table: "help_answers" } },
  { file: "admin_log.sql", probe: { kind: "table", table: "admin_log" } },
  { file: "admin_users.sql", probe: null, note: "function" },
  { file: "admin_quality.sql", probe: null, note: "function" },
  { file: "app_errors.sql", probe: { kind: "table", table: "app_errors" } },
  { file: "rate_limits.sql", probe: { kind: "table", table: "rate_events" } },
  { file: "admin_move_barcode.sql", probe: null, note: "function" },
  { file: "auto_approve.sql", probe: { kind: "table", table: "trusted_contributors" } },
  { file: "moderation.sql", probe: { kind: "table", table: "blocked_members" } },
  { file: "email_digest.sql", probe: { kind: "column", table: "profiles", column: "email_digest" } },
  { file: "push_subscriptions.sql", probe: { kind: "table", table: "push_subscriptions" } },
  { file: "trade_list.sql", probe: { kind: "column", table: "collection_items", column: "for_trade" } },
  // Third round.
  { file: "indexes.sql", probe: null, note: "index" },
  { file: "notification_prefs.sql", probe: { kind: "column", table: "profiles", column: "notify_prefs" } },
  { file: "feature_flags.sql", probe: { kind: "table", table: "feature_flags" } },
  { file: "smart_collections.sql", probe: { kind: "table", table: "smart_collections" } },
  { file: "shelf_location.sql", probe: { kind: "column", table: "collection_items", column: "shelf_location" } },
];

/** PostgREST/Postgres codes for "this table, column or function doesn't exist". */
export const MISSING_CODES = ["PGRST202", "PGRST204", "PGRST205", "42P01", "42703", "42883"];

export function isMissingError(error: { code?: string } | null | undefined): boolean {
  return !!error && MISSING_CODES.includes(error.code ?? "");
}
