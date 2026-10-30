-- Which notifications a member wants by push and by e-mail, per kind
-- (barcode reviews, friend requests, loan reminders). Missing keys mean
-- "yes", so nothing changes until a member unticks something. Safe to run
-- again.

alter table public.profiles add column if not exists notify_prefs jsonb not null default '{}'::jsonb;
