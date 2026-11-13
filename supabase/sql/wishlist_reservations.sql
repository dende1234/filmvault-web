-- Recipients may reserve/cross off gifts only while the owner shares the
-- wishlist. The wishlist itself remains owner-only. No account is required;
-- a random, browser-held secret permits undoing that recipient's own mark.
-- Apply after public_wishlist.sql. Idempotent; no existing wishes changed.
begin;
create schema if not exists private;
create table if not exists private.wishlist_reservations (
  wishlist_item_id uuid primary key references public.wishlist_items(id) on delete cascade,
  token_hash text not null,
  reserved_at timestamptz not null default now()
);
alter table private.wishlist_reservations enable row level security;
revoke all on private.wishlist_reservations from public, anon, authenticated;

-- Deliberate, narrowly scoped anonymous endpoint: sharing is its authorization.
-- SECURITY DEFINER is necessary to reach owner-only wishes and private marks;
-- callers receive only public wishlist data and reservation booleans, never
-- tokens, hashes or a guest's identity. Direct table access is not granted.
create or replace function public.get_public_wishlist_with_reservations(p_user_id uuid, p_token text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; viewer_hash text;
begin
  result := public.get_public_wishlist(p_user_id);
  if result is null then return null; end if;
  if p_token ~ '^[0-9a-f]{64}$' then
    viewer_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  end if;
  return result || jsonb_build_object(
    'reservations_ready', true,
    'items', coalesce((
      select jsonb_agg(entry.item || jsonb_build_object(
        'is_reserved', r.wishlist_item_id is not null,
        'reserved_by_you', coalesce(r.token_hash = viewer_hash, false),
        'can_release', r.wishlist_item_id is not null and (coalesce(r.token_hash = viewer_hash, false) or coalesce(auth.uid() = p_user_id, false))
      ) order by entry.ordinality)
      from jsonb_array_elements(result->'items') with ordinality as entry(item, ordinality)
      join public.wishlist_items w on w.user_id = p_user_id and w.tmdb_movie_id = (entry.item->>'tmdb_movie_id')::int
      left join private.wishlist_reservations r on r.wishlist_item_id = w.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.set_public_wishlist_reservation(p_user_id uuid, p_tmdb_movie_id int, p_token text, p_reserved boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare item_id uuid; viewer_hash text; existing_hash text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' or p_reserved is null then
    return 'invalid';
  end if;
  -- A row lock serializes two recipients selecting the same present. Turning
  -- sharing off also immediately prevents further reservations and undo.
  select w.id into item_id from public.wishlist_items w
    join public.profiles p on p.id = w.user_id
    where w.user_id = p_user_id and w.tmdb_movie_id = p_tmdb_movie_id and p.wishlist_public
    for update of w for share of p;
  if item_id is null then return 'unavailable'; end if;
  viewer_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  select r.token_hash into existing_hash from private.wishlist_reservations r where r.wishlist_item_id = item_id;
  if p_reserved then
    if existing_hash is not null then
      return case when existing_hash = viewer_hash then 'reserved' else 'taken' end;
    end if;
    insert into private.wishlist_reservations (wishlist_item_id, token_hash) values (item_id, viewer_hash);
    return 'reserved';
  end if;
  if existing_hash is null then return 'released'; end if;
  if existing_hash <> viewer_hash and auth.uid() is distinct from p_user_id then return 'not_allowed'; end if;
  delete from private.wishlist_reservations where wishlist_item_id = item_id;
  return 'released';
end;
$$;

create or replace function public.wishlist_reservations_ready()
returns boolean language sql stable security invoker set search_path = '' as $$ select true $$;

revoke all on function public.get_public_wishlist_with_reservations(uuid, text) from public;
revoke all on function public.set_public_wishlist_reservation(uuid, int, text, boolean) from public;
revoke all on function public.wishlist_reservations_ready() from public;
grant execute on function public.get_public_wishlist_with_reservations(uuid, text) to anon, authenticated;
grant execute on function public.set_public_wishlist_reservation(uuid, int, text, boolean) to anon, authenticated;
grant execute on function public.wishlist_reservations_ready() to anon, authenticated;
commit;
