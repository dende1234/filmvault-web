-- Auto-approve per contributor: an admin marks a member as trusted on
-- /admin/users/<id>; their single-release submissions are then approved
-- right after they submit (boxes still go through the queue). Trust lives
-- in its own admin-only table, so members can't grant it to themselves.
-- Needs approve_pending.sql. Safe to run again.

create table if not exists public.trusted_contributors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid default auth.uid(),
  granted_at timestamptz not null default now()
);

alter table public.trusted_contributors enable row level security;

drop policy if exists trusted_contributors_admin on public.trusted_contributors;
create policy trusted_contributors_admin on public.trusted_contributors
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- The approval itself, without the admin check: only called by the two
-- functions below, never directly by a client.
create or replace function public.approve_pending_barcode_core(p_id uuid)
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

revoke all on function public.approve_pending_barcode_core(uuid) from public, anon, authenticated;

-- Admins: unchanged behaviour, now on top of the core.
create or replace function public.approve_pending_barcode(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not_admin';
  end if;
  perform public.approve_pending_barcode_core(p_id);
end;
$$;

-- A trusted member right after submitting: approves their own pending,
-- single-release submission. Returns false when not trusted (it then just
-- waits in the queue as usual).
create or replace function public.approve_own_trusted(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.trusted_contributors where user_id = auth.uid()) then
    return false;
  end if;
  if not exists (
    select 1 from public.pending_barcodes
     where id = p_id and submitted_by = auth.uid() and status = 'pending' and not coalesce(is_box, false)
  ) then
    return false;
  end if;
  perform public.approve_pending_barcode_core(p_id);
  return true;
end;
$$;

revoke all on function public.approve_pending_barcode(uuid) from public, anon;
grant execute on function public.approve_pending_barcode(uuid) to authenticated;
revoke all on function public.approve_own_trusted(uuid) from public, anon;
grant execute on function public.approve_own_trusted(uuid) to authenticated;
