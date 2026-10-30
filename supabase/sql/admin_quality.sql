-- /admin/quality: titles that sit in many collections but have no barcode
-- on the master film list yet (where adding one helps most). Admins only;
-- security definer because copies are private to their owner. Returns
-- titles and counts, never who owns them. Safe to run again.

create or replace function public.admin_titles_without_barcode(p_limit int default 50)
returns table (tmdb_movie_id bigint, movie_title text, movie_poster text, owners bigint, copies bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not_admin';
  end if;
  return query
    select ci.tmdb_movie_id::bigint, min(ci.movie_title)::text, min(ci.movie_poster)::text,
           count(distinct c.user_id), count(distinct ci.item_group_id)
      from public.collection_items ci
      join public.collections c on c.id = ci.collection_id
     where not exists (select 1 from public.barcodes b where b.tmdb_movie_id = ci.tmdb_movie_id)
     group by ci.tmdb_movie_id
     order by count(distinct c.user_id) desc, count(distinct ci.item_group_id) desc
     limit greatest(1, least(p_limit, 200));
end;
$$;

revoke all on function public.admin_titles_without_barcode(int) from public, anon;
grant execute on function public.admin_titles_without_barcode(int) to authenticated;
