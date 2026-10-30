-- Dashboard numbers computed in the database instead of loading every copy
-- into the web app (slow for big collections, and PostgREST caps a plain
-- select at 1000 rows). Security invoker: RLS applies, and only the caller's
-- own collections are counted. A copy that sits in several collections
-- (shared item_group_id) counts once. Safe to run again.

create or replace function public.dashboard_stats(p_recent int default 15)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with own as (
    select distinct on (ci.item_group_id) ci.*
      from public.collection_items ci
      join public.collections c on c.id = ci.collection_id
     where c.user_id = auth.uid()
     order by ci.item_group_id, ci.added_at desc nulls last, ci.id
  ),
  unw as (select * from own where not coalesce(watched, false)),
  unw_count as (select count(*) as n from unw)
  select jsonb_build_object(
    'titles', (select count(*) from own),
    'watched', (select count(*) from own where coalesce(watched, false)),
    'series', (select count(*) from own where tmdb_movie_id < 0),
    'unwatched', (select n from unw_count),
    'recent', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
                 from (select * from own order by added_at desc nulls last, id limit p_recent) r),
    'unwatched_recent', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
                           from (select * from unw order by added_at desc nulls last, id limit p_recent) r),
    -- "Film of the day": the same unwatched copy all day, rotating daily
    -- (UTC day number modulo the number of unwatched copies, newest first).
    'pick', (select to_jsonb(r)
               from (select * from unw order by added_at desc nulls last, id
                      offset (select case when n > 0 then (floor(extract(epoch from now()) / 86400)::bigint % n) else 0 end from unw_count)
                      limit 1) r),
    'surprise', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'collection_id', collection_id)), '[]'::jsonb)
                   from (select id, collection_id from unw order by random() limit 200) r)
  );
$$;

grant execute on function public.dashboard_stats(int) to authenticated;
