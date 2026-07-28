"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { removeCollectionItem } from "@/actions/collections";
import type { Collection, CollectionItem, MediaType } from "@/types/database";
import { posterUrl } from "@/types/tmdb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AddFilmFlow } from "@/components/add-film-flow";
import { AddBoxFlow } from "@/components/add-box-flow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const MEDIA_TYPES: MediaType[] = ["DVD", "Blu-ray", "VHS", "4K Ultra HD"];
const ALL = "all";

export function CollectionDetailClient({ collection, items }: { collection: Collection; items: CollectionItem[] }) {
  const { t } = useT();
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [watchedFilter, setWatchedFilter] = useState<"all" | "watched" | "not_watched">("all");
  const [sort, setSort] = useState<"name" | "added" | "rating">("name");
  const [pendingDelete, setPendingDelete] = useState<CollectionItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    let list = items;
    if (typeFilter !== ALL) list = list.filter((i) => i.type === typeFilter);
    if (watchedFilter === "watched") list = list.filter((i) => i.watched);
    if (watchedFilter === "not_watched") list = list.filter((i) => !i.watched);

    const copy = [...list];
    if (sort === "name") copy.sort((a, b) => a.movie_title.localeCompare(b.movie_title));
    else if (sort === "added") copy.sort((a, b) => (b.added_at ?? "").localeCompare(a.added_at ?? ""));
    else copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return copy;
  }, [items, typeFilter, watchedFilter, sort]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{collection.name}</h1>
          {collection.description && <p className="text-sm text-muted-foreground">{collection.description}</p>}
        </div>
        <div className="flex gap-2">
          <AddFilmFlow />
          <AddBoxFlow />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("label_type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("label_type")}</SelectItem>
            {MEDIA_TYPES.map((type) => (
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
            <SelectItem value="all">{t("label_type")}</SelectItem>
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
            <SelectItem value="rating">{t("rating_star_prefix", "")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("collection_detail_empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((item) => {
            const poster = posterUrl(item.movie_poster, "w200");
            return (
              <div key={item.id} className="group relative flex flex-col gap-2">
                <Link href={`/collections/${collection.id}/items/${item.id}`}>
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted">
                    {poster && <Image src={poster} alt={item.movie_title} fill className="object-cover" />}
                    {item.watched && (
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                        {t("watched_label")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-medium">{item.movie_title}</p>
                </Link>
                <button
                  onClick={() => setPendingDelete(item)}
                  className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:block"
                  aria-label={t("action_delete")}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
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
