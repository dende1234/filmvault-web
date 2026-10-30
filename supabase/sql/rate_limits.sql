-- Per-member limits on heavy actions (shelf scan costs money per photo,
-- imports and barcode lookups call outside services). The app asks
-- hit_rate_limit() before doing the work; it records the attempt and says
-- whether it is still within the limit. Events older than a day are
-- cleaned up as new ones come in. Safe to run again.

create table if not exists public.rate_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_events_lookup_idx on public.rate_events (user_id, key, created_at desc);

alter table public.rate_events enable row level security;
-- No policies: only hit_rate_limit() (security definer) touches the table.

create or replace function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  used int;
begin
  if me is null then
    return false;
  end if;
  select count(*) into used from public.rate_events
   where user_id = me and key = p_key and created_at > now() - make_interval(secs => p_window_seconds);
  if used >= p_limit then
    return false;
  end if;
  insert into public.rate_events (user_id, key) values (me, left(p_key, 40));
  if random() < 0.01 then
    delete from public.rate_events where created_at < now() - interval '1 day';
  end if;
  return true;
end;
$$;

revoke all on function public.hit_rate_limit(text, int, int) from public, anon;
grant execute on function public.hit_rate_limit(text, int, int) to authenticated;
