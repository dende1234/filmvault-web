-- Gift list: on a shared wishlist (/v/<user id>) visitors can mark a title
-- "I'm buying this", without an account, so two people don't buy the same
-- gift. The owner never sees what was reserved (it stays a surprise). A
-- visitor is recognised by a random token kept in their browser (only its
-- SHA-256 is stored). Reservations lapse after 120 days. Only reachable
-- through the functions below. Needs public_wishlist.sql. Safe to run again.

create table if not exists public.wishlist_reservations (
  owner_id uuid not null references auth.users (id) on delete cascade,
  tmdb_movie_id bigint not null,
  token_hash text not null check (char_length(token_hash) = 64),
  created_at timestamptz not null default now(),
  primary key (owner_id, tmdb_movie_id)
);

alter table public.wishlist_reservations enable row level security;
-- No policies on purpose: nobody reads or writes the table directly.

-- What is reserved on this wishlist, and which of those by this visitor.
-- Empty for the owner.
create or replace function public.wishlist_gift_status(p_owner uuid, p_token_hash text)
returns table (tmdb_movie_id bigint, mine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select r.tmdb_movie_id, r.token_hash = p_token_hash
    from public.wishlist_reservations r
    join public.profiles p on p.id = r.owner_id and p.wishlist_public
   where r.owner_id = p_owner
     and auth.uid() is distinct from p_owner
     and r.created_at > now() - interval '120 days'
     and exists (select 1 from public.wishlist_items w where w.user_id = r.owner_id and w.tmdb_movie_id = r.tmdb_movie_id);
$$;

-- Returns 'ok', 'taken', 'own', 'limit', 'not_found' or 'invalid'.
create or replace function public.reserve_wishlist_gift(p_owner uuid, p_tmdb_movie_id bigint, p_token_hash text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = p_owner then
    return 'own';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return 'invalid';
  end if;
  if not exists (
    select 1 from public.profiles p
      join public.wishlist_items w on w.user_id = p.id
     where p.id = p_owner and p.wishlist_public and w.tmdb_movie_id = p_tmdb_movie_id
  ) then
    return 'not_found';
  end if;

  delete from public.wishlist_reservations
   where owner_id = p_owner and tmdb_movie_id = p_tmdb_movie_id and created_at < now() - interval '120 days';

  if exists (select 1 from public.wishlist_reservations
              where owner_id = p_owner and tmdb_movie_id = p_tmdb_movie_id and token_hash = p_token_hash) then
    return 'ok';
  end if;
  -- One visitor can't block a whole list.
  if (select count(*) from public.wishlist_reservations where owner_id = p_owner and token_hash = p_token_hash) >= 15 then
    return 'limit';
  end if;

  insert into public.wishlist_reservations (owner_id, tmdb_movie_id, token_hash)
  values (p_owner, p_tmdb_movie_id, p_token_hash)
  on conflict do nothing;
  if found then
    return 'ok';
  end if;
  return 'taken';
end;
$$;

-- Only the visitor who reserved it can undo it.
create or replace function public.unreserve_wishlist_gift(p_owner uuid, p_tmdb_movie_id bigint, p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.wishlist_reservations
   where owner_id = p_owner and tmdb_movie_id = p_tmdb_movie_id and token_hash = p_token_hash;
  return found;
end;
$$;

revoke all on function public.wishlist_gift_status(uuid, text) from public;
revoke all on function public.reserve_wishlist_gift(uuid, bigint, text) from public;
revoke all on function public.unreserve_wishlist_gift(uuid, bigint, text) from public;
grant execute on function public.wishlist_gift_status(uuid, text) to anon, authenticated;
grant execute on function public.reserve_wishlist_gift(uuid, bigint, text) to anon, authenticated;
grant execute on function public.unreserve_wishlist_gift(uuid, bigint, text) to anon, authenticated;
