-- Purchase details per copy: price, date and shop. For your own records and
-- the printable overview for insurance (/collections/print shows the total).
-- Like the other copy details they are kept on every collection row of the
-- copy (shared item_group_id). Safe to run again.

alter table public.collection_items add column if not exists purchase_price numeric(10, 2);
alter table public.collection_items add column if not exists purchase_date date;
alter table public.collection_items add column if not exists purchase_shop text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'collection_items_purchase_price_check') then
    alter table public.collection_items
      add constraint collection_items_purchase_price_check check (purchase_price is null or (purchase_price >= 0 and purchase_price < 100000));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'collection_items_purchase_shop_length') then
    alter table public.collection_items
      add constraint collection_items_purchase_shop_length check (purchase_shop is null or char_length(purchase_shop) <= 80);
  end if;
end $$;
