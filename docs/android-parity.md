# Android parity: what the web added

The web app and the Android app share one Supabase database. Everything below
was added from the web repo (migrations in `supabase/sql/`, in the order of its
README). The Android app keeps working without any of it, but it can lose data
it doesn't know about, or miss features members expect. Per item: what Android
should at least do (**keep**), and what it could add (**could**).

## Columns on existing tables

| Table.column | Migration | Keep | Could |
|---|---|---|---|
| `collection_items.purchase_price`, `purchase_date`, `purchase_shop` | `purchase_details.sql` | Copy them along when a copy is added to another collection (same `item_group_id`) | Edit them, show collection value |
| `collection_items.for_trade` (`sale`/`trade`/`both`) | `trade_list.sql` | Copy along per `item_group_id` | Mark for sale/trade |
| `collection_items.shelf_location` (≤ 80 chars) | `shelf_location.sql` | Copy along per `item_group_id` | Edit and filter by location |
| `collection_items.loan_reminded_at` | `loan_reminders.sql` | Don't touch | — |
| `profiles.wishlist_public` | `public_wishlist.sql` | — | Toggle sharing, share `https://www.filmory.nl/v/<userId>` |
| `profiles.email_digest`, `digest_sent_at` | `email_digest.sql` | — | Toggle the weekly e-mail |
| `profiles.notify_prefs` (jsonb, `{push:{barcode:false}}`, missing = yes) | `notification_prefs.sql` | Respect it if Android sends its own push (kinds: `barcode`, `friends`, `loan`, `news`) | Same checkboxes as the web profile |

**Important:** code that copies a row to another collection, or re-creates rows
(e.g. "move to collection"), should copy *all* columns of the row, not a fixed
list, or these values are lost.

## New tables

| Table | Migration | Notes |
|---|---|---|
| `smart_collections` (owner-only: `name`, `filter` jsonb) | `smart_collections.sql` | Filter format: `lib/smart-filter.ts` |
| `feature_flags` | `feature_flags.sql` | Rules in `lib/feature-rules.ts`; Android could read them for its own features |
| `announcements` | `announcements.sql` | Admin-only; sent by the web cron |
| `push_subscriptions` | `push_subscriptions.sql` | Web push only (browser endpoints) |
| `app_errors`, `rate_limits`, `admin_log`, `help_answers`, `help_questions`, `trusted_contributors` | see README | Admin/support |

## New notification kind

`user_notifications.kind` may now also be `loan_reminder` (`loan_reminders.sql`)
and `announcement` (`announcements.sql`, payload `{title, body}`). An Android
notifications screen should show them, or at least skip unknown kinds instead
of failing.

## Database functions Android can use

- `approve_pending_barcode(id)`, `approve_pending_box(ids)`: approve in one transaction (`approve_pending.sql`)
- `approve_own_trusted(id)`: auto-approve for trusted contributors (`auto_approve.sql`)
- `dashboard_stats()`: dashboard numbers (`dashboard_stats.sql`)
- `create_my_loan_reminders(days)`: make loan reminders (`loan_reminders.sql`)
- `admin_move_barcode(...)`: move a barcode to the right title (`admin_move_barcode.sql`)

## Behaviour to keep in step

- Combo formats such as `4K + Blu-ray` (`lib/formats.ts`) are stored as one `type` string.
- Only admins can change `profiles.is_admin` (`protect_admin_flag.sql`); this is
  enforced in the database for both apps.

## Collection onboarding and growth

- Apply `owned_releases.sql` and `collection_growth.sql` from the web repository.
- `collection_items.catalog_status` is an optional text field: `verified`,
  `unverified` (catalogue details not confirmed), or `personal` (no barcode).
  Carry it through copy/move/undo operations; existing clients may ignore it.
- `save_owned_release(p_release jsonb, p_collection_ids uuid[])` saves owned
  copies immediately and queues unknown nonempty barcodes in one transaction.
  `p_release` has barcode/type/editie, optional boxName/details and films
  (tmdb_movie_id/movie_title/movie_poster/seasons). An empty barcode is valid
  for personal ownership, and never enters the shared catalogue. Returns
  collection IDs where nothing new was added. RLS and an explicit ownership
  check apply. Trusted contributor approval remains available.
- Catalogue rejection retains the personal copy. Approval updates its status
  without inserting it again or overwriting notes and purchase details.
- The existing approval RPCs remain compatible. Older Android clients still
  queue new codes first until they adopt the save RPC.
- `collection_growth_events` is trigger-written and admin-read only. It
  observes actual collection saves/edits by their owner, including Android;
  admin approvals and pending submissions don't count as user return.
- `admin_collection_growth_stats()` reports distinct-title activation in the
  first seven days and return in days 7–30, with mature cohorts and source
  breakdowns. Existing `admin_growth_stats()` and its history stay unchanged.

## Shared wishlist reservations

- `wishlist_reservations.sql` adds a private, RLS-protected reservation table.
  A reservation does not delete a wishlist item or mark it as owned/watched.
- `get_public_wishlist_with_reservations(user_id, token)` returns the existing
  public projection plus `reservations_ready` and per-item `is_reserved`,
  `reserved_by_you` and `can_release`. Tokens and hashes are never returned.
- `set_public_wishlist_reservation(user_id, tmdb_movie_id, token, reserved)`
  works without login only while the owner shares the wishlist. A random
  32-byte token identifies the recipient for undo; web stores it in an
  HttpOnly cookie. Other recipients cannot undo someone else's reservation;
  the signed-in wishlist owner can. Persist the token privately if Android
  adopts this endpoint. Do not use a device identifier or place it in a URL.
- Old `get_public_wishlist` clients remain compatible and read-only. Delete
  a wish and its reservation is removed by the foreign-key cascade.
