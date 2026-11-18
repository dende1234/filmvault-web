-- Series always come with their seasons (series_support.sql), also in a box.
-- 1. approve_pending_box (approve_pending.sql) now refuses a series without
--    seasons and, unlike before, carries the seasons into the film list and
--    the copies it adds.
-- 2. admin_set_pending_seasons: an admin sets or corrects the seasons of a
--    submitted series (single or in a box) before approving it; the
--    submitter's own copy of that release gets them too.
-- Safe to run again.

create or replace function public.approve_pending_box(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_found int;
  box uuid;
  box_label text;
  targets uuid[];
  eligible uuid[];
  r public.pending_barcodes;
  grp uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not_admin';
  end if;

  perform 1 from public.pending_barcodes where id = any(p_ids) and status = 'pending' for update;
  get diagnostics rows_found = row_count;
  if rows_found = 0 or rows_found <> cardinality(p_ids) then
    raise exception 'not_pending';
  end if;

  select min(box_group_id::text)::uuid, min(box_name) into box, box_label
    from public.pending_barcodes where id = any(p_ids);
  if box is null or exists (
    select 1 from public.pending_barcodes where id = any(p_ids) and box_group_id is distinct from box
  ) then
    raise exception 'not_one_box';
  end if;

  -- A series in the catalogue always says which seasons are in the release.
  if exists (select 1 from public.pending_barcodes where id = any(p_ids)
              and tmdb_movie_id < 0 and coalesce(cardinality(seasons), 0) = 0) then
    raise exception 'seasons_required';
  end if;

  update public.pending_barcodes set status = 'approved' where id = any(p_ids);

  insert into public.barcodes (tmdb_movie_id, barcode, type, editie, is_box, box_group_id, box_name, seasons)
  select p.tmdb_movie_id, p.barcode, coalesce(p.type, 'DVD'), coalesce(p.editie, 'Normaal'), true, box, box_label,
         case when p.tmdb_movie_id < 0 and coalesce(cardinality(p.seasons), 0) > 0 then p.seasons end
    from public.pending_barcodes p
   where p.id = any(p_ids)
     and not exists (select 1 from public.barcodes b where b.tmdb_movie_id = p.tmdb_movie_id and b.barcode = p.barcode)
  on conflict do nothing;

  select coalesce(array_agg(distinct l.collection_id), (select array_agg(distinct collection_id) from public.pending_barcodes where id = any(p_ids)))
    into targets
    from public.pending_barcode_collections l
   where l.pending_barcode_id = any(p_ids);

  -- A collection is skipped when it already holds ANY film of this box.
  select array_agg(t) into eligible
    from unnest(targets) as t
   where t is not null
     and not exists (
       select 1 from public.collection_items ci
        where ci.collection_id = t
          and ci.tmdb_movie_id in (select tmdb_movie_id from public.pending_barcodes where id = any(p_ids))
     );

  if eligible is null then
    return;
  end if;

  -- Each film of the box is its own copy (own item_group_id), shared
  -- across the eligible collections.
  for r in select * from public.pending_barcodes where id = any(p_ids) loop
    grp := gen_random_uuid();
    insert into public.collection_items (
      collection_id, item_group_id, tmdb_movie_id, movie_title, movie_poster, barcode, type, editie,
      is_box, box_group_id, box_name, seasons
    )
    select t, grp, r.tmdb_movie_id, r.movie_title, r.movie_poster, r.barcode,
           coalesce(r.type, 'DVD'), coalesce(r.editie, 'Normaal'), true, box, box_label,
           case when r.tmdb_movie_id < 0 and coalesce(cardinality(r.seasons), 0) > 0 then r.seasons end
      from unnest(eligible) as t;
  end loop;
end;
$$;

create or replace function public.admin_set_pending_seasons(p_id uuid, p_seasons int[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pending_barcodes%rowtype;
  clean int[];
  updated int;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not_admin';
  end if;
  select array_agg(distinct s order by s) into clean from unnest(p_seasons) s where s between 0 and 1000;
  if coalesce(cardinality(clean), 0) = 0 then raise exception 'seasons_required'; end if;

  select * into p from public.pending_barcodes where id = p_id and status = 'pending' for update;
  if not found then raise exception 'not_pending'; end if;
  if p.tmdb_movie_id >= 0 then raise exception 'not_a_series'; end if;

  update public.pending_barcodes set seasons = clean where id = p_id;

  -- The submitter already owns this copy (owned_releases.sql): same release.
  update public.collection_items ci set seasons = clean
    from public.collections c
   where c.id = ci.collection_id
     and c.user_id = p.submitted_by
     and ci.tmdb_movie_id = p.tmdb_movie_id
     and coalesce(ci.barcode, '') = coalesce(p.barcode, '')
     and ci.box_group_id is not distinct from p.box_group_id;
  get diagnostics updated = row_count;
  return updated;
end;
$$;

revoke all on function public.approve_pending_box(uuid[]) from public, anon;
grant execute on function public.approve_pending_box(uuid[]) to authenticated;
revoke all on function public.admin_set_pending_seasons(uuid, int[]) from public, anon;
grant execute on function public.admin_set_pending_seasons(uuid, int[]) to authenticated;
