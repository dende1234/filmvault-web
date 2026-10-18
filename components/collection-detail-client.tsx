"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Film, SearchX, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { removeBoxFromCollection, removeCollectionItem } from "@/actions/collections";
import { getMediaTypes } from "@/actions/media-types";
import { isLoanOverdue, type Collection, type CollectionItem } from "@/types/database";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { isSeries } from "@/lib/titles";
import { useSeasonsLabel } from "@/components/seasons-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { AddFilmFlow } from "@/components/add-film-flow";
import { AddBoxFlow } from "@/components/add-box-flow";
import { ShareCollectionButton } from "@/components/share-collection-button";
import { BoxCard } from "@/components/box-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const ALL = "all";

/** A box shows as one card: its films share box_group_id (older boxes without
 * one fall back to name + barcode). */
type Entry = { kind: "item"; item: CollectionItem } | { kind: "box"; key: string; items: CollectionItem[] };

function boxKey(item: CollectionItem): string | null {
  if (!item.is_box) return null;
  return item.box_group_id ?? `${item.box_name ?? ""}|${item.barcode}`;
}

export function CollectionDetailClient({
  collection,
  items,
  isOwner,
  shareUrl,
}: {
  collection: Collection;
  items: CollectionItem[];
  isOwner: boolean;
  shareUrl: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [watchedFilter, setWatchedFilter] = useState<"all" | "watched" | "not_watched">("all");
  const [kindFilter, setKindFilter] = useState<"all" | "movie" | "tv">("all");
  const [boxFilter, setBoxFilter] = useState<"all" | "boxes" | "single">("all");
  const hasBoxes = items.some((i) => i.is_box);
  const seasonsLabel = useSeasonsLabel();
  const hasSeries = items.some((i) => isSeries(i.tmdb_movie_id));
  const [sort, setSort] = useState<"name" | "added" | "rating">("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CollectionItem | null>(null);
  const [pendingBoxDelete, setPendingBoxDelete] = useState<CollectionItem[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);

  useEffect(() => {
    getMediaTypes().then(setMediaTypes);
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = (i: CollectionItem) =>
      (typeFilter === ALL || i.type === typeFilter) &&
      (kindFilter !== "movie" || !isSeries(i.tmdb_movie_id)) &&
      (kindFilter !== "tv" || isSeries(i.tmdb_movie_id)) &&
      (watchedFilter !== "watched" || i.watched) &&
      (watchedFilter !== "not_watched" || !i.watched) &&
      (!query || i.movie_title.toLowerCase().includes(query) || (i.box_name ?? "").toLowerCase().includes(query));

    // Group boxes first (all their films), then keep a box when any film matches.
    const entries: Entry[] = [];
    const boxes = new Map<string, CollectionItem[]>();
    for (const item of items) {
      const key = boxKey(item);
      if (!key) {
        if (boxFilter !== "boxes" && matches(item)) entries.push({ kind: "item", item });
        continue;
      }
      if (boxFilter === "single") continue;
      if (!boxes.has(key)) boxes.set(key, []);
      boxes.get(key)!.push(item);
    }
    for (const [key, boxItems] of boxes) {
      if (boxItems.some(matches)) entries.push({ kind: "box", key, items: boxItems });
    }

    const name = (e: Entry) => (e.kind === "item" ? e.item.movie_title : (e.items[0].box_name ?? e.items[0].movie_title));
    const added = (e: Entry) => (e.kind === "item" ? [e.item] : e.items).reduce((max, i) => ((i.added_at ?? "") > max ? (i.added_at ?? "") : max), "");
    const rating = (e: Entry) => Math.max(...(e.kind === "item" ? [e.item] : e.items).map((i) => i.rating ?? 0));
    if (sort === "name") entries.sort((a, b) => name(a).localeCompare(name(b)));
    else if (sort === "added") entries.sort((a, b) => added(b).localeCompare(added(a)));
    else entries.sort((a, b) => rating(b) - rating(a));
    return entries;
  }, [items, typeFilter, kindFilter, boxFilter, watchedFilter, sort, searchQuery]);

  async function handleBoxDelete() {
    if (!pendingBoxDelete) return;
    setIsDeleting(true);
    try {
      await removeBoxFromCollection(collection.id, pendingBoxDelete.map((i) => i.id));
      setPendingBoxDelete(null);
      router.refresh();
    } catch {
      toast.error(t("box_remove_error"));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await removeCollectionItem(pendingDelete.id);
      setPendingDelete(null);
      router.refresh();
    } catch {
      toast.error(t("collection_item_remove_error"));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={collection.name}
        description={
          <>
            {t("collections_film_count", items.length)}
            {collection.description && <> · {collection.description}</>}
          </>
        }
        actions={
          <>
            <AddFilmFlow />
            <AddBoxFlow />
            {isOwner && (
              <ShareCollectionButton collectionId={collection.id} initialPublic={collection.is_public === true} shareUrl={shareUrl} />
            )}
          </>
        }
      />

      {items.length > 0 && (
        <div className="sticky top-[57px] z-20 -mx-4 flex flex-col gap-2 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md md:top-0 md:-mx-8 md:px-8 lg:flex-row lg:items-center">
          <SearchInput
            placeholder={t("collection_search_placeholder")}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />

          <div className="flex flex-wrap gap-2 lg:flex-nowrap">
            {hasBoxes && (
              <Select value={boxFilter} onValueChange={(v) => setBoxFilter(v as typeof boxFilter)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filter_boxes_all")}</SelectItem>
                  <SelectItem value="single">{t("filter_boxes_single")}</SelectItem>
                  <SelectItem value="boxes">{t("filter_boxes_only")}</SelectItem>
                </SelectContent>
              </Select>
            )}
            {hasSeries && (
              <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filter_all_titles")}</SelectItem>
                  <SelectItem value="movie">{t("picker_kind_movies")}</SelectItem>
                  <SelectItem value="tv">{t("picker_kind_series")}</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("label_type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("filter_all_types")}</SelectItem>
                {mediaTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={watchedFilter} onValueChange={(v) => setWatchedFilter(v as typeof watchedFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filter_all_films")}</SelectItem>
                <SelectItem value="watched">{t("watched_label")}</SelectItem>
                <SelectItem value="not_watched">{t("not_watched_label")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{t("label_name")}</SelectItem>
                <SelectItem value="added">{t("collections_sort_newest")}</SelectItem>
                <SelectItem value="rating">{t("sort_rating")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Film}
          title={t("collection_detail_empty")}
          description={t("collection_detail_empty_description")}
          action={<AddFilmFlow />}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={SearchX} title={t("collection_detail_no_matches")} />
      ) : (
        <PosterGrid>
          {filtered.map((entry) => {
            if (entry.kind === "box") {
              const first = entry.items[0];
              const films = [...entry.items].sort((a, b) => a.movie_title.localeCompare(b.movie_title));
              return (
                <BoxCard
                  key={`box-${entry.key}`}
                  name={first.box_name ?? first.movie_title}
                  type={first.type}
                  editie={first.editie}
                  href={first.box_group_id ? `/collections/${collection.id}/boxes/${first.box_group_id}` : undefined}
                  onRemove={isOwner ? () => setPendingBoxDelete(entry.items) : undefined}
                  films={films.map((i) => ({
                    key: i.id,
                    title: i.movie_title,
                    poster: i.movie_poster,
                    customCover: i.custom_cover_path,
                    watched: i.watched,
                    href: `/collections/${collection.id}/items/${i.id}`,
                  }))}
                />
              );
            }
            const item = entry.item;
            return (
            <div key={item.id} className="group relative flex flex-col gap-2">
              <Link href={`/collections/${collection.id}/items/${item.id}`} className="flex flex-col gap-2 focus-visible:outline-none">
                <Poster path={item.movie_poster} customCover={item.custom_cover_path} title={item.movie_title} hover>
                  <PosterCorner position="bl">
                    <Badge variant="overlay">{item.type}</Badge>
                    {isSeries(item.tmdb_movie_id) && <Badge variant="overlay">{seasonsLabel(item.seasons)}</Badge>}
                    {item.watched && (
                      <Badge variant="overlay" className="px-1.5" title={t("watched_label")}>
                        <Eye className="text-success" />
                      </Badge>
                    )}
                  </PosterCorner>
                  {isLoanOverdue(item) && (
                    <PosterCorner position="tl">
                      <Badge variant="destructive" className="bg-destructive text-destructive-foreground">
                        {t("collection_item_loan_overdue_short", item.loaned_to ?? "")}
                      </Badge>
                    </PosterCorner>
                  )}
                </Poster>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                    {item.movie_title}
                  </p>
                  {item.editie && item.editie !== "Normaal" && <p className="text-xs text-muted-foreground">{item.editie}</p>}
                </div>
              </Link>
              <PosterCorner position="tr">
                <button
                  type="button"
                  onClick={() => setPendingDelete(item)}
                  className="rounded-full bg-black/70 p-1.5 text-white backdrop-blur-sm transition-opacity hover:bg-destructive focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  aria-label={t("action_delete")}
                >
                  <X className="size-3.5" />
                </button>
              </PosterCorner>
            </div>
            );
          })}
        </PosterGrid>
      )}

      <Dialog open={!!pendingBoxDelete} onOpenChange={(open) => !open && setPendingBoxDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("box_remove_title")}</DialogTitle>
            <DialogDescription>
              {pendingBoxDelete &&
                t("box_remove_confirm", pendingBoxDelete[0].box_name ?? pendingBoxDelete[0].movie_title, pendingBoxDelete.length)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingBoxDelete(null)} disabled={isDeleting}>
              {t("action_cancel")}
            </Button>
            <Button variant="destructive" onClick={handleBoxDelete} disabled={isDeleting}>
              {t("action_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("collection_item_delete_title")}</DialogTitle>
            <DialogDescription>
              {pendingDelete && t("collection_item_delete_confirm_text", pendingDelete.movie_title)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={isDeleting}>
              {t("action_cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {t("action_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
