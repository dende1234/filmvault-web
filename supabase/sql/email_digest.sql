-- Weekly e-mail summary of your notifications (approved barcodes, loan
-- reminders, ...). Opt-in on the profile page, off by default. Sent by the
-- web app's weekly job (app/api/cron/digest), which uses the service role
-- key to read members' notifications. Safe to run again.

alter table public.profiles add column if not exists email_digest boolean not null default false;
alter table public.profiles add column if not exists digest_sent_at timestamptz;
