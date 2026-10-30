# SQL migrations (web)

New migrations written from the web repo. The main migration history lives in
the Android repo (`FilmVault/supabase/sql/`); copy these files there too so
both apps share one history.

Run them in the Supabase SQL editor, in this order (each file is safe to run
again):

1. `approve_pending.sql` — approve a submitted barcode/box in one transaction
2. `dashboard_stats.sql` — dashboard numbers computed in the database
3. `purchase_details.sql` — purchase price, date and shop per copy
4. `loan_reminders.sql` — reminder notification for loans older than 30 days (made when the dashboard opens)
5. `public_wishlist.sql` — share your wishlist via a link
6. `help_answers.sql` — Reel answers managed from /admin/feedback
7. `admin_log.sql` — log of admin actions
8. `admin_users.sql` — counts per member on /admin/users/<id>

The web app keeps working before a file has run; `/admin/status` shows which
ones are still missing.
