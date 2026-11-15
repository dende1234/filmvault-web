-- Minimal existing Filmory schema for isolated PostgreSQL regression tests.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.user_id', true), '')::uuid
$$;
grant usage on schema auth to authenticated, anon;
create table public.profiles (id uuid primary key, is_admin boolean default false);
create function public.is_admin() returns boolean language sql stable security definer as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;
create table public.collections (id uuid primary key, user_id uuid references profiles(id));
create table public.media_types (name text primary key);
create table public.edities (name text primary key);
insert into media_types values ('Blu-ray'), ('DVD'), ('4K Ultra HD');
insert into edities values ('Normaal'), ('Steelbook');
create table public.barcodes (
  id uuid primary key default gen_random_uuid(), tmdb_movie_id bigint, barcode text, type text, editie text,
  seasons int[], is_box boolean not null default false, box_group_id uuid, box_name text,
  unique (barcode, tmdb_movie_id)
);
create table public.collection_items (
  id uuid primary key default gen_random_uuid(), collection_id uuid references collections(id),
  item_group_id uuid not null, tmdb_movie_id bigint, movie_title text, movie_poster text,
  barcode text not null, type text references media_types(name), editie text references edities(name), seasons int[],
  is_box boolean default false, box_group_id uuid, box_name text,
  cut text, label text, region text, audio_languages text[], subtitle_languages text[],
  watched boolean default false, rating numeric, added_at timestamptz default now(), personal_note text
);
create table public.pending_barcodes (
  id uuid primary key default gen_random_uuid(), tmdb_movie_id bigint, movie_title text, movie_poster text,
  barcode text, type text, editie text, seasons int[], submitted_by uuid references profiles(id),
  collection_id uuid references collections(id), status text default 'pending',
  is_box boolean default false, box_group_id uuid, box_name text,
  cut text, region text, label text, audio_languages text[], subtitle_languages text[]
);
create table public.pending_barcode_collections (
  pending_barcode_id uuid references pending_barcodes(id), collection_id uuid references collections(id),
  unique (pending_barcode_id, collection_id)
);
create table public.app_events (user_id uuid, event text, source text, created_at timestamptz default now());
create table public.trusted_contributors (user_id uuid primary key);
grant select on public.profiles, public.media_types, public.edities, public.barcodes to authenticated;
grant select, insert, update, delete on public.collections, public.collection_items, public.pending_barcodes, public.pending_barcode_collections to authenticated;
alter table collections enable row level security;
create policy own_collections on collections to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table collection_items enable row level security;
create policy own_items on collection_items to authenticated
  using (exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid()))
  with check (exists (select 1 from collections c where c.id = collection_id and c.user_id = auth.uid()));
alter table pending_barcodes enable row level security;
create policy own_pending on pending_barcodes to authenticated using (submitted_by = auth.uid()) with check (submitted_by = auth.uid());
alter table pending_barcode_collections enable row level security;
create policy own_links on pending_barcode_collections to authenticated
  using (exists (select 1 from pending_barcodes p where p.id = pending_barcode_id and p.submitted_by = auth.uid()))
  with check (exists (select 1 from pending_barcodes p where p.id = pending_barcode_id and p.submitted_by = auth.uid()));
