-- Smart collections: a saved filter over all your copies ("all 4K",
-- "steelbooks", "unwatched Criterion") that fills itself. Only the filter is
-- stored; the copies stay where they are. Owner-only. Safe to run again.

create table if not exists public.smart_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  filter jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists smart_collections_user_idx on public.smart_collections (user_id);

alter table public.smart_collections enable row level security;

drop policy if exists smart_collections_own on public.smart_collections;
create policy smart_collections_own on public.smart_collections
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
