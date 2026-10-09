"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Check, Flag, ListChecks, Plus, Trash2, X } from "lucide-react";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

  const ownedCount = items.filter((i) => owned.has(i.tmdb_movie_id)).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={list.name}
        description={list.description ?? undefined}
        actions={
          <>
            {isMine && (
              <Button onClick={() => setPickerOpen(true)}>
                <Plus />
                {t("list_detail_add_movie")}
              </Button>
            )}
            {!isMine && (
              <Button variant={isSubscribed ? "secondary" : "default"} disabled={isSubProcessing} onClick={toggleSubscription}>
                {isSubscribed ? t("lists_unsubscribe_button") : t("lists_subscribe_button")}
              </Button>
            )}
            {!isMine && (
              <Button variant="ghost" onClick={() => setShowReportDialog(true)}>
                <Flag />
                {t("action_report")}
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" className="text-destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 />
                {t("list_detail_delete_list")}
              </Button>
            )}
          </>
        }
      />

      {items.length > 0 && (
        <div className="flex max-w-md flex-col gap-1.5">
          <Progress value={ownedCount} max={items.length} label={t("lists_progress_format", ownedCount, items.length)} />
          <p className="text-xs text-muted-foreground">{t("lists_progress_format", ownedCount, items.length)}</p>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={ListChecks} title={t("list_detail_empty")} />
      ) : (
        <PosterGrid>
          {items.map((item) => {
            const isOwned = owned.has(item.tmdb_movie_id);
            return (
              <div key={item.id} className="group relative flex flex-col gap-2">
                <Link href={`/films/${item.tmdb_movie_id}`} className="flex flex-col gap-2 focus-visible:outline-none">
                  <Poster
                    path={item.movie_poster}
                    title={item.movie_title}
                    hover
                    className={isOwned ? undefined : "opacity-50 grayscale transition-[filter,opacity] group-hover:opacity-100 group-hover:grayscale-0"}
                  >
                    {isOwned && (
                      <PosterCorner position="bl">
                        <Badge variant="overlay">
                          <Check className="text-success" />
                          {t("list_detail_owned_label")}
                        </Badge>
                      </PosterCorner>
                    )}
                  </Poster>
                  <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                    {item.movie_title}
                  </p>
                </Link>
                {isMine && (
                  <PosterCorner position="tr">
                    <button
                      type="button"
                      onClick={() => setPendingRemove(item)}
                      className="rounded-full bg-black/70 p-1.5 text-white backdrop-blur-sm transition-opacity hover:bg-destructive focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      aria-label={t("list_detail_remove_movie")}
                    >
                      <X className="size-3.5" />
                    </button>
                  </PosterCorner>
                )}
              </div>
            );
          })}
        </PosterGrid>
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
