"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Disc3, Download, Eye, Film, Image as ImageIcon, MoreHorizontal, Printer, ScanLine, SearchX, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { removeBoxFromCollection, removeCollectionItem } from "@/actions/collections";
import { getMediaTypes } from "@/actions/media-types";
import { isLoanOverdue, type Collection, type CollectionItem } from "@/types/database";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { PageHeader } from "@/components/page-header";
import { formatPrice, totalValue } from "@/lib/purchase";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { isSeries } from "@/lib/titles";
import { formatShort, matchesFormat, singleFormats } from "@/lib/formats";
import { compareTitles, shelfLetter } from "@/lib/sort-title";
import { useLocalFlag } from "@/lib/use-local-flag";
import { CaseBand, hasCaseBand } from "@/components/movie/case-band";
import { useSeasonsLabel } from "@/components/seasons-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { AddFilmFlow } from "@/components/add-film-flow";
import { AddBoxFlow } from "@/components/add-box-flow";
import { ShareCollectionButton } from "@/components/share-collection-button";
import { BoxCard } from "@/components/box-card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PosterControl, WatchedToggle } from "@/components/watched-toggle";
import { setFilmWatched } from "@/actions/watched";
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

const entryName = (e: Entry) => (e.kind === "item" ? e.item.movie_title : (e.items[0].box_name ?? e.items[0].movie_title));
const ALPHABET = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

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
  const { t, locale } = useT();
  const value = useMemo(() => totalValue(items), [items]);
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [watchedFilter, setWatchedFilter] = useState<"all" | "watched" | "not_watched">("all");
  const [kindFilter, setKindFilter] = useState<"all" | "movie" | "tv">("all");
  const [boxFilter, setBoxFilter] = useState<"all" | "boxes" | "single">("all");
  const hasBoxes = items.some((i) => i.is_box);
  const seasonsLabel = useSeasonsLabel();
  const hasSeries = items.some((i) => isSeries(i.tmdb_movie_id));
  const [sort, setSort] = useState<"name" | "added" | "rating">("name");
  // Posters drawn as disc cases (format strip on top); per viewer, default on.
  const [plainPosters, setPlainPosters] = useLocalFlag("fv_plain_posters");
  const caseLook = !plainPosters;
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CollectionItem | null>(null);
  const [pendingBoxDelete, setPendingBoxDelete] = useState<CollectionItem[] | null>(null);
  // Watched is per title (film_logs), so every copy of a film flips together.
  const [watchedOverride, setWatchedOverride] = useState<Map<number, boolean>>(new Map());
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const isWatched = (i: CollectionItem) => watchedOverride.get(i.tmdb_movie_id) ?? i.watched;

  async function toggleWatched(item: CollectionItem) {
    const id = item.tmdb_movie_id;
    const next = !isWatched(item);
    setWatchedOverride((prev) => new Map(prev).set(id, next));
    setTogglingIds((prev) => new Set(prev).add(id));
    const result = await setFilmWatched({ tmdbMovieId: id, title: item.movie_title, poster: item.movie_poster }, next).catch(() => ({
      error: "failed",
    }));
    setTogglingIds((prev) => {
      const s2 = new Set(prev);
      s2.delete(id);
      return s2;
    });
    if (result.error) {
      setWatchedOverride((prev) => new Map(prev).set(id, !next));
      toast.error(t("watched_toggle_error"));
    } else router.refresh();
  }
  const [isDeleting, setIsDeleting] = useState(false);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);

  useEffect(() => {
    getMediaTypes().then(setMediaTypes);
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = (i: CollectionItem) =>
      (typeFilter === ALL || matchesFormat(i.type, typeFilter)) &&
      (kindFilter !== "movie" || !isSeries(i.tmdb_movie_id)) &&
      (kindFilter !== "tv" || isSeries(i.tmdb_movie_id)) &&
      (watchedFilter !== "watched" || isWatched(i)) &&
      (watchedFilter !== "not_watched" || !isWatched(i)) &&
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

    const name = entryName;
    const added = (e: Entry) => (e.kind === "item" ? [e.item] : e.items).reduce((max, i) => ((i.added_at ?? "") > max ? (i.added_at ?? "") : max), "");
    const rating = (e: Entry) => Math.max(...(e.kind === "item" ? [e.item] : e.items).map((i) => i.rating ?? 0));
    if (sort === "name") entries.sort((a, b) => compareTitles(name(a), name(b)));
    else if (sort === "added") entries.sort((a, b) => added(b).localeCompare(added(a)));
    else entries.sort((a, b) => rating(b) - rating(a));
    return entries;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isWatched reads watchedOverride
  }, [items, typeFilter, kindFilter, boxFilter, watchedFilter, sort, searchQuery, watchedOverride]);

  // Shelf letters (A–Z, "#") when sorted by name, like a collector's app.
  const letterGroups = useMemo(() => {
    const groups: { letter: string; entries: Entry[] }[] = [];
    for (const e of filtered) {
      const letter = shelfLetter(entryName(e));
      const last = groups[groups.length - 1];
      if (last?.letter === letter) last.entries.push(e);
      else groups.push({ letter, entries: [e] });
    }
    return groups;
  }, [filtered]);

  const renderEntry = (entry: Entry) => {
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
                    watched: isWatched(i),
                    href: `/collections/${collection.id}/items/${i.id}`,
                    onToggleWatched: isOwner && !togglingIds.has(i.tmdb_movie_id) ? () => toggleWatched(i) : undefined,
                  }))}
                />
              );
            }
            const item = entry.item;
            return (
            <div key={item.id} className="group relative flex flex-col gap-2 @container">
              <Link href={`/collections/${collection.id}/items/${item.id}`} className="flex flex-col gap-2 focus-visible:outline-none">
                <Poster path={item.movie_poster} customCover={item.custom_cover_path} title={item.movie_title} hover className="@container">
                  {caseLook && !item.custom_cover_path && <CaseBand type={item.type} />}
                  <PosterCorner position="bl">
                    {!(caseLook && !item.custom_cover_path && hasCaseBand(item.type)) && <Badge variant="overlay">{formatShort(item.type)}</Badge>}
                    {isSeries(item.tmdb_movie_id) && <Badge variant="overlay">{seasonsLabel(item.seasons)}</Badge>}
                    {!isOwner && isWatched(item) && (
                      <Badge variant="overlay" className="px-1.5" title={t("watched_label")}>
                        <Eye className="text-success" />
                      </Badge>
                    )}
                  </PosterCorner>

                  {isLoanOverdue(item) && (
                    <PosterCorner position="tl" className={caseLook ? "top-[12%]" : undefined}>
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
                  {(() => {
                    const region = item.region ? (item.region === "Regiovrij" ? t("details_region_free") : t("details_region_value", item.region)) : null;
                    const sub = [item.editie !== "Normaal" ? item.editie : null, item.cut, item.label, region].filter(Boolean).join(" · ");
                    return sub ? <p className="line-clamp-1 text-xs text-muted-foreground">{sub}</p> : null;
                  })()}
                </div>
              </Link>
              {isOwner && (
                <PosterControl>
                  <WatchedToggle
                    watched={isWatched(item)}
                    disabled={togglingIds.has(item.tmdb_movie_id)}
                    onToggle={() => toggleWatched(item)}
                  />
                </PosterControl>
              )}
              {/* Below the case strip (9% of a 2:3 poster = 13.5% of its width). */}
              <PosterCorner position="tr" className={caseLook && !item.custom_cover_path ? "top-[calc(13.5cqw+6px)]" : undefined}>
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
  };

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
            {isOwner && value.priced > 0 && <> · {t("collection_value", formatPrice(value.total, locale))}</>}
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
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" aria-label={t("nav_more")}>
                    <MoreHorizontal />
                    {t("nav_more")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/scannen?modus=meerdere&collection=${collection.id}`}>
                      <ScanLine />
                      {t("bulk_scan_button")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    {/* Plain link: the route answers with a CSV download. */}
                    <a href={`/api/export?collection=${collection.id}`} download>
                      <Download />
                      {t("export_button")}
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/collections/print?collection=${collection.id}`}>
                      <Printer />
                      {t("print_menu")}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                {/* Single formats only: "Blu-ray" also finds "4K Ultra HD + Blu-ray". */}
                {singleFormats(mediaTypes).map((type) => (
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

            <Button
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => setPlainPosters(!plainPosters)}
              aria-pressed={caseLook}
              title={t(caseLook ? "collection_view_posters" : "collection_view_cases")}
            >
              {caseLook ? <ImageIcon /> : <Disc3 />}
              {t(caseLook ? "collection_view_posters" : "collection_view_cases")}
            </Button>
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
        <div className="flex flex-col gap-8">
          {sort === "name" && letterGroups.length > 3 && (
            <nav aria-label={t("collection_letters_nav")} className="scrollbar-none -mx-4 -mb-2 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
              {ALPHABET.map((letter) => {
                const present = letterGroups.some((g) => g.letter === letter);
                return present ? (
                  <a
                    key={letter}
                    href={`#letter-${letter === "#" ? "0" : letter}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-foreground hover:bg-elevated hover:text-primary"
                  >
                    {letter}
                  </a>
                ) : (
                  <span key={letter} className="flex size-7 shrink-0 items-center justify-center text-xs text-muted-foreground/40" aria-hidden>
                    {letter}
                  </span>
                );
              })}
            </nav>
          )}
          {(sort === "name" ? letterGroups : [{ letter: "", entries: filtered }]).map((group) => (
            <section key={group.letter || "all"} id={group.letter ? `letter-${group.letter === "#" ? "0" : group.letter}` : undefined} className="flex scroll-mt-44 flex-col gap-4">
              {group.letter && (
                <h2 className="flex items-center gap-4 font-display text-xl font-semibold text-muted-foreground">
                  <span className="h-px flex-1 bg-border" aria-hidden />
                  {group.letter}
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </h2>
              )}
              <PosterGrid dense={caseLook}>{group.entries.map(renderEntry)}</PosterGrid>
            </section>
          ))}
        </div>
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
