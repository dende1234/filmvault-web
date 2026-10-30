-- Share your wishlist via a link (/v/<user id>), e.g. for birthdays. Off by
-- default; the owner switches it on. Read through get_public_wishlist()
-- (security definer) so wishlist_items itself stays owner-only (wishlist.sql).
-- Safe to run again.

alter table public.profiles add column if not exists wishlist_public boolean not null default false;

create or replace function public.get_public_wishlist(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'owner_id', p.id,
    'owner_name', p.name,
    'owner_avatar', p.avatar_url,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'tmdb_movie_id', w.tmdb_movie_id,
               'movie_title', w.movie_title,
               'movie_poster', w.movie_poster,
               'seasons', to_jsonb(w) -> 'seasons',
               'is_grail', coalesce((to_jsonb(w) ->> 'is_grail')::boolean, false),
               'added_at', w.added_at)
             order by coalesce((to_jsonb(w) ->> 'is_grail')::boolean, false) desc, w.added_at desc nulls last)
        from public.wishlist_items w
       where w.user_id = p.id
    ), '[]'::jsonb)
  )
  from public.profiles p
  where p.id = p_user_id and p.wishlist_public;
$$;

grant execute on function public.get_public_wishlist(uuid) to anon, authenticated;
