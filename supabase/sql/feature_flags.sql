-- Switch features on step by step (/admin/features): off, admins only,
-- chosen members, a percentage of members, or everyone, without a new
-- release. Everyone signed in can read the switches (the app checks them);
-- only admins can change them. Safe to run again.

create table if not exists public.feature_flags (
  key text primary key check (char_length(key) <= 40),
  mode text not null default 'admins' check (mode in ('off', 'admins', 'users', 'percent', 'all')),
  percent int not null default 0 check (percent between 0 and 100),
  user_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

alter table public.feature_flags enable row level security;

drop policy if exists feature_flags_read on public.feature_flags;
create policy feature_flags_read on public.feature_flags
  for select to authenticated
  using (true);

drop policy if exists feature_flags_admin_write on public.feature_flags;
create policy feature_flags_admin_write on public.feature_flags
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
