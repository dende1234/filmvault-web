"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import {
  addItemToList,
  deleteList,
  removeItemFromList,
  subscribe,
  unsubscribe,
} from "@/actions/curated-lists";
import type { CuratedList, CuratedListItem } from "@/types/database";
import type { MovieSummaryDto } from "@/types/tmdb";
import { posterUrl } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { ReportDialog } from "@/components/report-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function CuratedListDetailClient({
  list,
  items,
  ownedTmdbIds,
  isMine,
  isAdmin = false,
  isSubscribed: initialSubscribed,
}: {
  list: CuratedList;
  items: CuratedListItem[];
  ownedTmdbIds: number[];
  isMine: boolean;
  isAdmin?: boolean;
  isSubscribed: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const owned = new Set(ownedTmdbIds);
  const canDelete = isMine || isAdmin;
  const [isSubscribed, setIsSubscribed] = useState(initialSubscribed);
  const [isSubProcessing, setIsSubProcessing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<CuratedListItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  async function toggleSubscription() {
    setIsSubProcessing(true);
    try {
      if (isSubscribed) await unsubscribe(list.id);
      else await subscribe(list.id);
      setIsSubscribed(!isSubscribed);
    } catch {
      toast.error(t("lists_error_action"));
    } finally {
      setIsSubProcessing(false);
    }
  }

  async function handleAddMovie(movie: MovieSummaryDto) {
    setPickerOpen(false);
    try {
      await addItemToList(list.id, movie.id, movie.title, movie.poster_path);
      router.refresh();
    } catch {
      toast.error(t("list_detail_error_add_movie"));
    }
  }

  async function handleRemove() {
    if (!pendingRemove) return;
    try {
      await removeItemFromList(pendingRemove.id, list.id);
      setPendingRemove(null);
      router.refresh();
    } catch {
      toast.error(t("list_detail_error_remove_movie"));
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteList(list.id);
      router.replace("/lists");
      router.refresh();
    } catch {
      toast.error(t("list_detail_error_delete"));
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{list.name}</h1>
          {list.description && <p className="text-sm text-muted-foreground">{list.description}</p>}
        </div>
        <div className="flex gap-2">
          {isMine && <Button onClick={() => setPickerOpen(true)}>{t("list_detail_add_movie")}</Button>}
          {!isMine && (
            <Button variant={isSubscribed ? "outline" : "default"} disabled={isSubProcessing} onClick={toggleSubscription}>
              {isSubscribed ? t("lists_unsubscribe_button") : t("lists_subscribe_button")}
            </Button>
          )}
          {!isMine && (
            <Button variant="outline" onClick={() => setShowReportDialog(true)}>
              {t("action_report")}
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              {t("list_detail_delete_list")}
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("list_detail_empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => {
            const isOwned = owned.has(item.tmdb_movie_id);
            const poster = posterUrl(item.movie_poster, "w200");
            return (
              <div key={item.id} className={`group relative flex flex-col gap-2 ${isOwned ? "" : "opacity-40"}`}>
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted">
                  {poster && <Image src={poster} alt={item.movie_title} fill className="object-cover" />}
                </div>
                <p className="line-clamp-2 text-sm font-medium">{item.movie_title}</p>
                <p className="text-xs text-muted-foreground">
                  {isOwned ? t("list_detail_owned_label") : t("list_detail_not_owned_label")}
                </p>
                {isMine && (
                  <button
                    onClick={() => setPendingRemove(item)}
                    className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-1 text-white group-hover:block"
                    aria-label={t("list_detail_remove_movie")}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <MovieSearchPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={handleAddMovie} />

      <Dialog open={!!pendingRemove} onOpenChange={(open) => !open && setPendingRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("list_detail_remove_movie")}</DialogTitle>
            <DialogDescription>
              {pendingRemove && t("list_detail_remove_movie_confirm_text", pendingRemove.movie_title)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRemove(null)}>
              {t("action_cancel")}
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              {t("action_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("list_detail_delete_list")}</DialogTitle>
            <DialogDescription>{t("list_detail_delete_confirm_text")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              {t("action_cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {t("action_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportDialog open={showReportDialog} onOpenChange={setShowReportDialog} contentType="curated_list" contentId={list.id} />
    </div>
  );
}
