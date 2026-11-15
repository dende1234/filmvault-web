-- Formats and editions are managed in /admin/manage-types (media_types,
-- edities), but older schemas also have a fixed list in check constraints
-- (e.g. collection_items_type_check). A type added later, such as a combo
-- "4K Ultra HD + Blu-ray", then fails on save with error 23514. This
-- replaces those fixed lists by a check against the tables themselves, for
-- collection_items, pending_barcodes and barcodes. Existing rows are not
-- touched. Safe to run again.
--
-- To see the old rule first:
--   select conrelid::regclass, conname, pg_get_constraintdef(oid) from pg_constraint
--    where contype = 'c' and conname ~ '_(type|editie)_check$';

do $$
declare
  t text;
  c record;
begin
  foreach t in array array['collection_items', 'pending_barcodes', 'barcodes'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    for c in
      select conname from pg_constraint
       where conrelid = ('public.' || t)::regclass
         and contype = 'c'
         and conname in (t || '_type_check', t || '_editie_check')
    loop
      execute format('alter table public.%I drop constraint %I', t, c.conname);
    end loop;
  end loop;
end $$;

-- Values must exist in media_types / edities (null and '' stay allowed, as
-- before). Only checked when the value is written or changed, so renaming or
-- removing a type in the admin never blocks existing copies.
create or replace function public.check_media_type_and_edition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.type, '') <> ''
     and (tg_op = 'INSERT' or new.type is distinct from old.type)
     and not exists (select 1 from public.media_types m where m.name = new.type) then
    raise exception 'unknown media type: %', new.type using errcode = '23514';
  end if;
  if coalesce(new.editie, '') <> ''
     and (tg_op = 'INSERT' or new.editie is distinct from old.editie)
     and not exists (select 1 from public.edities e where e.name = new.editie) then
    raise exception 'unknown edition: %', new.editie using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.check_media_type_and_edition() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['collection_items', 'pending_barcodes', 'barcodes'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists check_media_type_and_edition on public.%I', t);
    execute format(
      'create trigger check_media_type_and_edition before insert or update of type, editie on public.%I
         for each row execute function public.check_media_type_and_edition()', t);
  end loop;
end $$;
