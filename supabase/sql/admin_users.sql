-- /admin/users/<id>: counts for one member, for admins only. Security
-- definer because collections and copies are private to their owner (RLS);
-- returns numbers only, never the collection contents. Safe to run again.

create or replace function public.admin_user_overview(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not_admin';
  end if;
  return jsonb_build_object(
    'collections', (select count(*) from public.collections where user_id = p_user_id),
    'public_collections', (select count(*) from public.collections where user_id = p_user_id and coalesce((to_jsonb(collections) ->> 'is_public')::boolean, false)),
    'copies', (select count(distinct ci.item_group_id)
                 from public.collection_items ci join public.collections c on c.id = ci.collection_id
                where c.user_id = p_user_id),
    'wishlist', (select count(*) from public.wishlist_items where user_id = p_user_id),
    'last_added', (select max(ci.added_at)
                     from public.collection_items ci join public.collections c on c.id = ci.collection_id
                    where c.user_id = p_user_id)
  );
end;
$$;

revoke all on function public.admin_user_overview(uuid) from public, anon;
grant execute on function public.admin_user_overview(uuid) to authenticated;
