-- Indexes for the lookups the app does most (see actions/*.ts). Without
-- them big collections and the admin pages slow down as members grow.
-- Only creates what's missing; safe to run again. Primary keys and unique
-- columns already have an index and aren't repeated here.

create index if not exists collection_items_collection_id_idx on public.collection_items (collection_id);
create index if not exists collection_items_item_group_id_idx on public.collection_items (item_group_id);
create index if not exists collection_items_barcode_idx on public.collection_items (barcode);
create index if not exists collection_items_tmdb_movie_id_idx on public.collection_items (tmdb_movie_id);
create index if not exists collection_items_box_group_id_idx on public.collection_items (box_group_id) where box_group_id is not null;

create index if not exists collections_user_id_idx on public.collections (user_id);

create index if not exists barcodes_barcode_idx on public.barcodes (barcode);
create index if not exists barcodes_tmdb_movie_id_idx on public.barcodes (tmdb_movie_id);

create index if not exists pending_barcodes_status_idx on public.pending_barcodes (status);
create index if not exists pending_barcodes_submitted_by_idx on public.pending_barcodes (submitted_by, status);
create index if not exists pending_barcode_collections_pending_idx on public.pending_barcode_collections (pending_barcode_id);

create index if not exists wishlist_items_user_id_idx on public.wishlist_items (user_id, tmdb_movie_id);

create index if not exists film_logs_user_id_idx on public.film_logs (user_id, tmdb_movie_id);
create index if not exists film_viewings_user_id_idx on public.film_viewings (user_id);

create index if not exists user_notifications_user_unread_idx on public.user_notifications (user_id, created_at desc) where read_at is null;

create index if not exists posts_author_created_idx on public.posts (author_id, created_at desc);
create index if not exists post_comments_post_id_idx on public.post_comments (post_id);

-- Search (actions/search.ts) does "title contains": trigram indexes make
-- that fast. pg_trgm is a standard Supabase extension.
create extension if not exists pg_trgm with schema extensions;
create index if not exists collection_items_title_trgm_idx on public.collection_items using gin (movie_title extensions.gin_trgm_ops);
create index if not exists wishlist_items_title_trgm_idx on public.wishlist_items using gin (movie_title extensions.gin_trgm_ops);
