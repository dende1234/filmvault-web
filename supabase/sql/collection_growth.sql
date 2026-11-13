-- Additional product metrics; the old marketing metrics remain unchanged.
-- Requires growth_tracking.sql. Observation starts now (no guessed history).
begin;
create schema if not exists private;

create table if not exists private.collection_growth_config (
  singleton boolean primary key default true check (singleton),
  started_at timestamptz not null default now()
);
insert into private.collection_growth_config (singleton) values (true) on conflict do nothing;

create table if not exists public.collection_growth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tmdb_movie_id bigint not null,
  item_group_id uuid not null,
  kind text not null check (kind in ('saved', 'updated')),
  occurred_at timestamptz not null default now()
);
alter table public.collection_growth_events enable row level security;
revoke all on public.collection_growth_events from public, anon, authenticated;
grant select on public.collection_growth_events to authenticated;
drop policy if exists collection_growth_admin_read on public.collection_growth_events;
create policy collection_growth_admin_read on public.collection_growth_events
  for select to authenticated using (public.is_admin());
create unique index if not exists collection_growth_daily_idx
  on public.collection_growth_events (user_id, item_group_id, kind, ((occurred_at at time zone 'UTC')::date));
create index if not exists collection_growth_user_time_idx
  on public.collection_growth_events (user_id, occurred_at);

create or replace function private.log_collection_growth()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid;
begin
  select c.user_id into actor from public.collections c where c.id = new.collection_id;
  -- Admin catalogue approval and background jobs aren't a member returning.
  if actor is distinct from auth.uid() then return new; end if;
  if tg_op = 'UPDATE' and (to_jsonb(new) - array['catalog_status', 'updated_at'])
    is not distinct from (to_jsonb(old) - array['catalog_status', 'updated_at']) then return new; end if;
  insert into public.collection_growth_events (user_id, tmdb_movie_id, item_group_id, kind)
    values (actor, new.tmdb_movie_id, new.item_group_id, case when tg_op = 'INSERT' then 'saved' else 'updated' end)
    on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.log_collection_growth() from public, anon, authenticated;
drop trigger if exists collection_growth on public.collection_items;
create trigger collection_growth after insert or update on public.collection_items
  for each row execute function private.log_collection_growth();

create or replace function public.admin_collection_growth_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'not_admin'; end if;
  with signups as (
    select distinct on (user_id) user_id, created_at as signed_up_at, coalesce(source, 'direct') as source
      from public.app_events where event = 'signup'
      order by user_id, created_at
  ), members as (
    select s.*,
      (select count(distinct e.tmdb_movie_id) from public.collection_growth_events e
       where e.user_id = s.user_id and e.kind = 'saved' and e.occurred_at >= s.signed_up_at
         and e.occurred_at < s.signed_up_at + interval '7 days') as titles_week_one,
      exists (select 1 from public.collection_growth_events e where e.user_id = s.user_id
        and e.occurred_at >= s.signed_up_at + interval '7 days'
        and e.occurred_at < s.signed_up_at + interval '30 days') as returned
    from signups s where s.signed_up_at >= (select started_at from private.collection_growth_config)
  )
  select jsonb_build_object(
    'tracking_since', (select started_at from private.collection_growth_config),
    'signups', (select count(*) from members),
    'first_success', (select count(*) from members where titles_week_one > 0),
    'activation_cohort', (select count(*) from members where signed_up_at <= now() - interval '7 days'),
    'activated', (select count(*) from members where signed_up_at <= now() - interval '7 days' and titles_week_one >= 5),
    'return_cohort', (select count(*) from members where signed_up_at <= now() - interval '30 days'),
    'returned', (select count(*) from members where signed_up_at <= now() - interval '30 days' and returned),
    'regular_users', (select count(*) from (
      select user_id from public.collection_growth_events where occurred_at >= now() - interval '30 days'
      group by user_id having count(distinct (occurred_at at time zone 'UTC')::date) >= 2
    ) r),
    'by_source', coalesce((select jsonb_agg(to_jsonb(t)) from (
      select source, count(*) as signups,
        count(*) filter (where signed_up_at <= now() - interval '7 days') as activation_cohort,
        count(*) filter (where signed_up_at <= now() - interval '7 days' and titles_week_one >= 5) as activated,
        count(*) filter (where signed_up_at <= now() - interval '30 days') as return_cohort,
        count(*) filter (where signed_up_at <= now() - interval '30 days' and returned) as returned
      from members group by source order by count(*) desc
    ) t), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_collection_growth_stats() from public, anon;
grant execute on function public.admin_collection_growth_stats() to authenticated;
commit;
