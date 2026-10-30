-- Ruillijst: mark a copy as for sale, for trade or both. Friends see it
-- when they compare collections (the existing friends RLS already lets
-- them read your copies). Kept on every collection row of the copy
-- (shared item_group_id). Safe to run again.

alter table public.collection_items add column if not exists for_trade text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'collection_items_for_trade_check') then
    alter table public.collection_items
      add constraint collection_items_for_trade_check check (for_trade is null or for_trade in ('sale', 'trade', 'both'));
  end if;
end $$;
