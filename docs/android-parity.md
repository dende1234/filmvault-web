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
