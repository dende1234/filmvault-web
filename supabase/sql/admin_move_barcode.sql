-- /admin/quality: a barcode registered for the wrong title is moved to the
-- right one, and members' copies with that barcode move along (title and
-- poster too). If the right title already has this barcode, the wrong
-- entry is simply removed. Admins only. Safe to run again.

create or replace function public.admin_move_barcode(p_barcode_id uuid, p_to_tmdb_id bigint, p_title text, p_poster text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.barcodes;
  moved int := 0;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not_admin';
  end if;
  select * into b from public.barcodes where id = p_barcode_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if b.tmdb_movie_id = p_to_tmdb_id then
    return 0;
  end if;

  update public.collection_items
     set tmdb_movie_id = p_to_tmdb_id, movie_title = coalesce(p_title, movie_title), movie_poster = p_poster
   where barcode = b.barcode and tmdb_movie_id = b.tmdb_movie_id and not coalesce(is_box, false);
  get diagnostics moved = row_count;

  if exists (select 1 from public.barcodes where barcode = b.barcode and tmdb_movie_id = p_to_tmdb_id) then
    delete from public.barcodes where id = b.id;
  else
    update public.barcodes set tmdb_movie_id = p_to_tmdb_id where id = b.id;
  end if;
  return moved;
end;
$$;

revoke all on function public.admin_move_barcode(uuid, bigint, text, text) from public, anon;
grant execute on function public.admin_move_barcode(uuid, bigint, text, text) to authenticated;
