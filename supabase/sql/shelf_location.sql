-- Where a copy physically is ("Woonkamer · kast 2 · plank 3"), free text,
-- kept on every collection row of the copy (shared item_group_id). The
-- collection page can filter on it. Safe to run again.

alter table public.collection_items add column if not exists shelf_location text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'collection_items_shelf_location_length') then
    alter table public.collection_items
      add constraint collection_items_shelf_location_length check (shelf_location is null or char_length(shelf_location) <= 80);
  end if;
end $$;
