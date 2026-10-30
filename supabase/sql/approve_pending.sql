-- Approve a submitted barcode (or a whole box) in ONE transaction: status,
-- master list (barcodes) and the submitter's collection copies succeed or
-- fail together. Before this, the web app did these steps one by one, so a
-- failure halfway left an "approved" submission without the copy.
--
-- Used by the web app (actions/approvals.ts, falls back to its old step-by-
-- step code while this file hasn't run) and available to the Android app.
-- Needs: series_support.sql, copy_details.sql, contributors_region.sql.
-- The approval notification still comes from the trigger in
-- approval_notifications.sql (it fires on the status update below).
-- Safe to run again.

create or replace function public.approve_pending_ready()
returns boolean
language sql
stable
as $$ select true $$;

create or replace function public.approve_pending_barcode(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.pending_barcodes;
  targets uuid[];
  grp uuid := gen_random_uuid();
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not_admin';
  end if;

  select * into p from public.pending_barcodes where id = p_id and status = 'pending' for update;
  if not found then
    raise exception 'not_pending';
  end if;

  update public.pending_barcodes set status = 'approved' where id = p.id;

  if not exists (select 1 from public.barcodes b where b.tmdb_movie_id = p.tmdb_movie_id and b.barcode = p.barcode) then
    insert into public.barcodes (tmdb_movie_id, barcode, type, editie, seasons)
    values (
      p.tmdb_movie_id, p.barcode, coalesce(p.type, 'DVD'), coalesce(p.editie, 'Normaal'),
      case when coalesce(cardinality(p.seasons), 0) > 0 then p.seasons end
    )
    on conflict do nothing;
  end if;

  select coalesce(array_agg(distinct l.collection_id), array[p.collection_id])
    into targets
    from public.pending_barcode_collections l
   where l.pending_barcode_id = p.id;

  -- One physical copy: the same item_group_id in every target collection,
  -- skipping collections that already hold this exact barcode.
  insert into public.collection_items (
    collection_id, item_group_id, tmdb_movie_id, movie_title, movie_poster, barcode, type, editie,
    seasons, cut, region, label, audio_languages, subtitle_languages
  )
  select t, grp, p.tmdb_movie_id, p.movie_title, p.movie_poster, p.barcode,
         coalesce(p.type, 'DVD'), coalesce(p.editie, 'Normaal'),
         case when coalesce(cardinality(p.seasons), 0) > 0 then p.seasons end,
         p.cut, p.region, p.label, p.audio_languages, p.subtitle_languages
    from unnest(targets) as t
   where t is not null
     and not exists (select 1 from public.collection_items ci where ci.collection_id = t and ci.barcode = p.barcode);
end;
$$;

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

  update public.pending_barcodes set status = 'approved' where id = any(p_ids);

  insert into public.barcodes (tmdb_movie_id, barcode, type, editie, is_box, box_group_id, box_name)
  select p.tmdb_movie_id, p.barcode, coalesce(p.type, 'DVD'), coalesce(p.editie, 'Normaal'), true, box, box_label
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
      is_box, box_group_id, box_name
    )
    select t, grp, r.tmdb_movie_id, r.movie_title, r.movie_poster, r.barcode,
           coalesce(r.type, 'DVD'), coalesce(r.editie, 'Normaal'), true, box, box_label
      from unnest(eligible) as t;
  end loop;
end;
$$;

revoke all on function public.approve_pending_barcode(uuid) from public, anon;
revoke all on function public.approve_pending_box(uuid[]) from public, anon;
grant execute on function public.approve_pending_barcode(uuid) to authenticated;
grant execute on function public.approve_pending_box(uuid[]) to authenticated;
grant execute on function public.approve_pending_ready() to authenticated;
