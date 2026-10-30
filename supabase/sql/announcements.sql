-- Announcements from /admin/announcement that are planned for a later day
-- and/or meant for part of the members. The daily cron
-- (app/api/cron/announcements) sends the ones that are due. Members receive
-- them in /meldingen (kind 'announcement') and by web push. Admin-only.
-- Needs loan_reminders.sql (user_notifications kinds). Safe to run again.

create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  audience text not null default 'all' check (audience in ('all', 'nl', 'en', 'contributors', 'admins')),
  send_on date not null default current_date,
  sent_at timestamptz,
  recipients int,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists announcements_due_idx on public.announcements (send_on) where sent_at is null;

alter table public.announcements enable row level security;

drop policy if exists "announcements admin" on public.announcements;
create policy "announcements admin" on public.announcements
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Allow the new notification kind (keeps the earlier ones).
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.user_notifications'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.user_notifications drop constraint %I', c.conname);
  end loop;
  alter table public.user_notifications
    add constraint user_notifications_kind_check
    check (kind in ('barcode_approved', 'barcode_rejected', 'loan_reminder', 'announcement'));
end $$;
