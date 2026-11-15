-- Requires the existing series/copy-details and pending-link migrations.
-- A personal copy is usable immediately; only publication to barcodes waits
-- for review. Existing approval RPCs already skip copies with this barcode.
-- Run before deploying the new app. Idempotent; no existing copies removed.
begin;
create schema if not exists private;

alter table public.collection_items add column if not exists catalog_status text
  not null default 'verified' check (catalog_status in ('verified', 'unverified', 'personal'));

-- Catalogue verification is derived, never a client claim. Also protects
-- copy/undo operations and older clients that omit this optional column.
create or replace function private.classify_owned_release()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.catalog_status := case
    when coalesce(new.barcode, '') = '' then 'personal'
    when exists (select 1 from public.barcodes b where b.barcode = new.barcode
      and b.tmdb_movie_id = new.tmdb_movie_id and b.type = new.type and b.editie = new.editie
      and b.is_box = new.is_box and b.seasons is not distinct from new.seasons) then 'verified'
    else 'unverified' end;
  return new;
end;
$$;
revoke all on function private.classify_owned_release() from public, anon, authenticated;
drop trigger if exists classify_owned_release on public.collection_items;
create trigger classify_owned_release before insert or update of barcode, tmdb_movie_id, type, editie, seasons, is_box, catalog_status
  on public.collection_items for each row execute function private.classify_owned_release();

create or replace function public.save_owned_release(p_release jsonb, p_collection_ids uuid[])
returns uuid[] language plpgsql security invoker set search_path = public as $$
declare
  actor uuid := auth.uid();
  code text := coalesce(p_release->>'barcode', '');
  fmt text := p_release->>'type';
  edition text := p_release->>'editie';
  box_label text := nullif(p_release->>'boxName', '');
  box_id uuid;
  film jsonb;
  title_id bigint;
  season_numbers integer[];
  group_id uuid;
  pending_id uuid;
  target uuid;
  unchanged uuid[] := p_collection_ids;
  saved_id uuid;
  verified boolean;
begin
  if actor is null then raise exception 'not_authenticated'; end if;
  if coalesce(cardinality(p_collection_ids), 0) not between 1 and 100
     or jsonb_typeof(p_release->'films') is distinct from 'array'
     or jsonb_array_length(p_release->'films') not between 1 and 100
     or length(code) > 100
     or not exists (select 1 from public.media_types where name = fmt)
     or not exists (select 1 from public.edities where name = edition)
     or (box_label is null and jsonb_array_length(p_release->'films') <> 1)
  then raise exception 'invalid_release'; end if;

  -- Serialize saves by this owner, including simultaneous retries from another
  -- tab. Never reuse groups or queue rows belonging to another user.
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  if exists (select 1 from unnest(p_collection_ids) t
    where not exists (select 1 from public.collections c where c.id = t and c.user_id = actor))
  then raise exception 'collection_not_owned'; end if;

  if box_label is not null then
    select ci.box_group_id into box_id from public.collection_items ci
      join public.collections c on c.id = ci.collection_id
      where c.user_id = actor and ci.is_box and ci.barcode = code and ci.type = fmt
        and ci.editie = edition and ci.box_name = box_label limit 1;
    box_id := coalesce(box_id, gen_random_uuid());
  end if;

  for film in select value from jsonb_array_elements(p_release->'films') loop
    title_id := (film->>'tmdb_movie_id')::bigint;
    if title_id is null or title_id = 0 or length(coalesce(film->>'movie_title', '')) not between 1 and 500
      then raise exception 'invalid_title'; end if;
    select array_agg(distinct value::integer order by value::integer) into season_numbers
      from jsonb_array_elements_text(coalesce(nullif(film->'seasons', 'null'::jsonb), '[]'::jsonb));
    if title_id > 0 then season_numbers := null; end if;
    if exists (select 1 from unnest(season_numbers) n where n < 0 or n > 1000)
      then raise exception 'invalid_seasons'; end if;

    select exists (select 1 from public.barcodes b where b.barcode = code and b.tmdb_movie_id = title_id
      and b.type = fmt and b.editie = edition and b.is_box = (box_label is not null)
      and b.seasons is not distinct from season_numbers) into verified;
    select ci.item_group_id into group_id from public.collection_items ci
      join public.collections c on c.id = ci.collection_id
      where c.user_id = actor and ci.tmdb_movie_id = title_id and ci.barcode = code
        and ci.type = fmt and ci.editie = edition
        and ci.box_group_id is not distinct from box_id
        and ci.seasons is not distinct from season_numbers
        and (code <> '' or (
          ci.cut is not distinct from left(p_release->'details'->>'cut', 60)
          and ci.label is not distinct from left(p_release->'details'->>'label', 80)
          and ci.region is not distinct from left(p_release->'details'->>'region', 20)
        )) limit 1;
    group_id := coalesce(group_id, gen_random_uuid());

    foreach target in array p_collection_ids loop
      saved_id := null;
      insert into public.collection_items (collection_id, item_group_id, tmdb_movie_id, movie_title, movie_poster,
        barcode, type, editie, seasons, is_box, box_group_id, box_name, catalog_status,
        cut, label, region, audio_languages, subtitle_languages)
      select target, group_id, title_id, film->>'movie_title', film->>'movie_poster', code, fmt, edition,
        season_numbers, box_label is not null, box_id, box_label,
        case when code = '' then 'personal' when verified then 'verified' else 'unverified' end,
        left(p_release->'details'->>'cut', 60), left(p_release->'details'->>'label', 80),
        left(p_release->'details'->>'region', 20),
        (select array_agg(value) from jsonb_array_elements_text(coalesce(p_release->'details'->'audio_languages', '[]'::jsonb))),
        (select array_agg(value) from jsonb_array_elements_text(coalesce(p_release->'details'->'subtitle_languages', '[]'::jsonb)))
      where not exists (select 1 from public.collection_items ci
        where ci.collection_id = target and ci.item_group_id = group_id)
      returning id into saved_id;
      if saved_id is not null then unchanged := array_remove(unchanged, target); end if;
    end loop;

    if code <> '' and not verified then
      select id into pending_id from public.pending_barcodes
        where submitted_by = actor and barcode = code and tmdb_movie_id = title_id
          and status = 'pending' and is_box = (box_label is not null) limit 1;
      if pending_id is null then
        insert into public.pending_barcodes (tmdb_movie_id, movie_title, movie_poster, barcode, type, editie,
          seasons, submitted_by, collection_id, is_box, box_group_id, box_name,
          cut, label, region, audio_languages, subtitle_languages)
        values (title_id, film->>'movie_title', film->>'movie_poster', code, fmt, edition,
          season_numbers, actor, p_collection_ids[1], box_label is not null, box_id, box_label,
          left(p_release->'details'->>'cut', 60), left(p_release->'details'->>'label', 80),
          left(p_release->'details'->>'region', 20),
          (select array_agg(value) from jsonb_array_elements_text(coalesce(p_release->'details'->'audio_languages', '[]'::jsonb))),
          (select array_agg(value) from jsonb_array_elements_text(coalesce(p_release->'details'->'subtitle_languages', '[]'::jsonb))))
        returning id into pending_id;
      end if;
      insert into public.pending_barcode_collections (pending_barcode_id, collection_id)
        select pending_id, t from unnest(p_collection_ids) t
        on conflict (pending_barcode_id, collection_id) do nothing;
      if box_label is null and to_regprocedure('public.approve_own_trusted(uuid)') is not null then
        perform public.approve_own_trusted(pending_id);
      end if;
    end if;
  end loop;
  return unchanged;
end;
$$;
revoke all on function public.save_owned_release(jsonb, uuid[]) from public, anon;
grant execute on function public.save_owned_release(jsonb, uuid[]) to authenticated;

-- Approval never removes or overwrites personal details. Catalogue changes
-- only mark an exact matching release as verified, across clients.
create or replace function private.mark_owned_release_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.collection_items set catalog_status = 'verified'
    where barcode = new.barcode and tmdb_movie_id = new.tmdb_movie_id
      and type = new.type and editie = new.editie and is_box = new.is_box
      and catalog_status = 'unverified';
  return new;
end;
$$;
revoke all on function private.mark_owned_release_verified() from public, anon, authenticated;
drop trigger if exists owned_release_verified on public.barcodes;
create trigger owned_release_verified after insert or update on public.barcodes
  for each row execute function private.mark_owned_release_verified();
commit;
