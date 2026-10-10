"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Film, SearchX, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { removeCollectionItem } from "@/actions/collections";
import { getMediaTypes } from "@/actions/media-types";
import { isLoanOverdue, type Collection, type CollectionItem } from "@/types/database";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { AddFilmFlow } from "@/components/add-film-flow";
import { AddBoxFlow } from "@/components/add-box-flow";
import { ShareCollectionButton } from "@/components/share-collection-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const ALL = "all";

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
  const [sort, setSort] = useState<"name" | "added" | "rating">("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CollectionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);

  useEffect(() => {
    getMediaTypes().then(setMediaTypes);
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter !== ALL) list = list.filter((i) => i.type === typeFilter);
    if (watchedFilter === "watched") list = list.filter((i) => i.watched);
    if (watchedFilter === "not_watched") list = list.filter((i) => !i.watched);
    if (searchQuery.trim()) list = list.filter((i) => i.movie_title.toLowerCase().includes(searchQuery.trim().toLowerCase()));

    const copy = [...list];
    if (sort === "name") copy.sort((a, b) => a.movie_title.localeCompare(b.movie_title));
    else if (sort === "added") copy.sort((a, b) => (b.added_at ?? "").localeCompare(a.added_at ?? ""));
    else copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return copy;
  }, [items, typeFilter, watchedFilter, sort, searchQuery]);

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
          {filtered.map((item) => (
            <div key={item.id} className="group relative flex flex-col gap-2">
              <Link href={`/collections/${collection.id}/items/${item.id}`} className="flex flex-col gap-2 focus-visible:outline-none">
                <Poster path={item.movie_poster} title={item.movie_title} hover>
                  <PosterCorner position="bl">
                    <Badge variant="overlay">{item.type}</Badge>
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
          ))}
        </PosterGrid>
      )}

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
