-- Add a barcode later to a copy that has none (e.g. imported or added by
-- title). The barcode goes on every collection row of the copy (shared
-- item_group_id). If the master film list knows the barcode for this title,
-- the copy takes that release's format/edition/seasons and is verified at
-- once. Otherwise it's submitted for review exactly like a new barcode in
-- save_owned_release (pending_barcodes + pending_barcode_collections,
-- auto-approve for trusted contributors). Approval doesn't add a second copy:
-- approve_pending_barcode skips collections that already hold the barcode.
-- A barcode the list knows for another title, or as a box, is refused.
-- A series without seasons is refused ('seasons_required') until the copy
-- has its seasons. Needs owned_releases.sql. Safe to run again.

create or replace function public.add_barcode_to_copy(p_item_group_id uuid, p_barcode text)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  code text := regexp_replace(coalesce(p_barcode, ''), '[\s.\-#]', '', 'g');
  r public.collection_items%rowtype;
  known public.barcodes%rowtype;
  other public.barcodes%rowtype;
  collection_ids uuid[];
  pending_id uuid;
  approved boolean := false;
begin
  if actor is null then raise exception 'not_authenticated'; end if;
  if code !~ '^[0-9A-Za-z]{4,32}$' then return jsonb_build_object('status', 'invalid'); end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));

  select ci.* into r from public.collection_items ci
    join public.collections c on c.id = ci.collection_id
   where c.user_id = actor and ci.item_group_id = p_item_group_id
   limit 1;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if r.is_box then return jsonb_build_object('status', 'box'); end if;
  -- Only a copy without any barcode (on any of its collection rows).
  if exists (select 1 from public.collection_items ci
              where ci.item_group_id = p_item_group_id and coalesce(ci.barcode, '') <> '') then
    return jsonb_build_object('status', 'has_barcode');
  end if;

  select array_agg(distinct ci.collection_id) into collection_ids
    from public.collection_items ci
    join public.collections c on c.id = ci.collection_id
   where c.user_id = actor and ci.item_group_id = p_item_group_id;

  -- Known for another title, or as a box: almost always a typo or wrong scan.
  select * into other from public.barcodes b
   where b.barcode = code and (b.tmdb_movie_id <> r.tmdb_movie_id or b.is_box)
   limit 1;
  if found then
    return jsonb_build_object('status', 'conflict', 'tmdb_movie_id', other.tmdb_movie_id, 'is_box', other.is_box);
  end if;

  -- Known for this title: the barcode says which release it is.
  select * into known from public.barcodes b
   where b.barcode = code and b.tmdb_movie_id = r.tmdb_movie_id and not b.is_box
   order by (b.type = r.type and b.editie = r.editie) desc
   limit 1;
  if found then
    update public.collection_items ci
       set barcode = code, type = known.type, editie = known.editie,
           seasons = case when r.tmdb_movie_id < 0 then known.seasons else ci.seasons end
     where ci.item_group_id = p_item_group_id and ci.collection_id = any(collection_ids);
    return jsonb_build_object('status', 'verified', 'type', known.type, 'editie', known.editie);
  end if;

  -- A series goes to review only with its seasons (series_seasons.sql).
  if r.tmdb_movie_id < 0 and coalesce(cardinality(r.seasons), 0) = 0 then
    return jsonb_build_object('status', 'seasons_required');
  end if;

  update public.collection_items ci set barcode = code
   where ci.item_group_id = p_item_group_id and ci.collection_id = any(collection_ids);

  -- Unknown barcode: to the review queue, like any new barcode.
  select id into pending_id from public.pending_barcodes
   where submitted_by = actor and barcode = code and tmdb_movie_id = r.tmdb_movie_id
     and status = 'pending' and not is_box
   limit 1;
  if pending_id is null then
    insert into public.pending_barcodes (tmdb_movie_id, movie_title, movie_poster, barcode, type, editie,
      seasons, submitted_by, collection_id, is_box, cut, label, region, audio_languages, subtitle_languages)
    values (r.tmdb_movie_id, r.movie_title, r.movie_poster, code, r.type, r.editie,
      r.seasons, actor, collection_ids[1], false, r.cut, r.label, r.region, r.audio_languages, r.subtitle_languages)
    returning id into pending_id;
  end if;
  insert into public.pending_barcode_collections (pending_barcode_id, collection_id)
    select pending_id, t from unnest(collection_ids) t
    on conflict (pending_barcode_id, collection_id) do nothing;
  if to_regprocedure('public.approve_own_trusted(uuid)') is not null then
    approved := coalesce(public.approve_own_trusted(pending_id), false);
  end if;
  return jsonb_build_object('status', case when approved then 'verified' else 'pending' end);
end;
$$;

revoke all on function public.add_barcode_to_copy(uuid, text) from public, anon;
grant execute on function public.add_barcode_to_copy(uuid, text) to authenticated;
