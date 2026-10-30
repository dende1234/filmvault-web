-- Log of admin actions (/admin/log): who approved, rejected, deleted or
-- changed what, and when. Admins can read it and add their own entries;
-- nobody can change or delete entries. Safe to run again.

create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  admin_id uuid default auth.uid() references auth.users (id) on delete set null,
  action text not null check (char_length(action) <= 60),
  target_type text check (char_length(target_type) <= 40),
  target_id text check (char_length(target_id) <= 200),
  details jsonb not null default '{}'::jsonb
);

create index if not exists admin_log_created_at_idx on public.admin_log (created_at desc);
create index if not exists admin_log_action_idx on public.admin_log (action);

alter table public.admin_log enable row level security;

drop policy if exists admin_log_select_admin on public.admin_log;
create policy admin_log_select_admin on public.admin_log
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists admin_log_insert_admin on public.admin_log;
create policy admin_log_insert_admin on public.admin_log
  for insert to authenticated
  with check (
    admin_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
