"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import {
  removeCollectionItem,
  updateCollectionItemCondition,
  updateCollectionItemFavorite,
  updateCollectionItemLoan,
  updateCollectionItemNote,
  updateCollectionItemRating,
  updateCollectionItemTags,
  updateCollectionItemWatched,
} from "@/actions/collections";
import { isLoanOverdue, type CollectionItem, type Condition } from "@/types/database";
import type { MovieDetailDto } from "@/types/tmdb";
import { BackdropHero } from "@/components/movie/backdrop-hero";
import { Poster } from "@/components/movie/poster";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

const CONDITIONS: Condition[] = ["Nieuw", "Gebruikt", "Beschadigd"];

export function CollectionItemEditor({ item: initial, movie }: { item: CollectionItem; movie: MovieDetailDto | null }) {
  const { t } = useT();
  const router = useRouter();
  const [item, setItem] = useState(initial);
  const [note, setNote] = useState(initial.personal_note ?? "");
  const [newTag, setNewTag] = useState("");
  const [loanName, setLoanName] = useState("");
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function setRating(rating: number) {
    const previous = item.rating;
    setItem((prev) => ({ ...prev, rating }));
    try {
      await updateCollectionItemRating(item.item_group_id, rating);
    } catch {
      setItem((prev) => ({ ...prev, rating: previous }));
      toast.error(t("collection_item_detail_error_save_rating"));
    }
  }

  async function toggleWatched() {
    const next = !item.watched;
    setItem((prev) => ({ ...prev, watched: next }));
    try {
      await updateCollectionItemWatched(item.item_group_id, next);
    } catch {
      setItem((prev) => ({ ...prev, watched: !next }));
      toast.error(t("collection_item_detail_error_save_watched"));
    }
  }

  async function toggleFavorite() {
    const next = !item.is_favorite;
    setItem((prev) => ({ ...prev, is_favorite: next }));
    try {
      await updateCollectionItemFavorite(item.item_group_id, next);
    } catch {
      setItem((prev) => ({ ...prev, is_favorite: !next }));
      toast.error(t("collection_item_detail_error_save_favorite"));
    }
  }

  async function saveNote() {
    const previous = item.personal_note;
    const trimmed = note.trim() || null;
    setItem((prev) => ({ ...prev, personal_note: trimmed }));
    try {
      await updateCollectionItemNote(item.item_group_id, trimmed);
    } catch {
      setItem((prev) => ({ ...prev, personal_note: previous }));
      setNote(previous ?? "");
      toast.error(t("collection_item_detail_error_save_note"));
    }
  }

  async function setCondition(condition: Condition | null) {
    const previous = item.condition;
    setItem((prev) => ({ ...prev, condition }));
    try {
      await updateCollectionItemCondition(item.item_group_id, condition);
    } catch {
      setItem((prev) => ({ ...prev, condition: previous }));
      toast.error(t("collection_item_detail_error_save_condition"));
    }
  }

  async function markLoaned() {
    const trimmed = loanName.trim();
    if (!trimmed) return;
    const previous = { loaned_to: item.loaned_to, loaned_at: item.loaned_at };
    setItem((prev) => ({ ...prev, loaned_to: trimmed }));
    setShowLoanDialog(false);
    setLoanName("");
    try {
      await updateCollectionItemLoan(item.item_group_id, trimmed);
      router.refresh();
    } catch {
      setItem((prev) => ({ ...prev, ...previous }));
      toast.error(t("collection_item_detail_error_save_loan"));
    }
  }

  async function markReturned() {
    const previous = { loaned_to: item.loaned_to, loaned_at: item.loaned_at };
    setItem((prev) => ({ ...prev, loaned_to: null, loaned_at: null }));
    try {
      await updateCollectionItemLoan(item.item_group_id, null);
    } catch {
      setItem((prev) => ({ ...prev, ...previous }));
      toast.error(t("collection_item_detail_error_save_loan"));
    }
  }

  async function addTag() {
    const trimmed = newTag.trim();
    if (!trimmed || item.tags.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) return;
    const previous = item.tags;
    const next = [...item.tags, trimmed];
    setItem((prev) => ({ ...prev, tags: next }));
    setNewTag("");
    try {
      await updateCollectionItemTags(item.item_group_id, next);
    } catch {
      setItem((prev) => ({ ...prev, tags: previous }));
      toast.error(t("collection_item_detail_error_save_tags"));
    }
  }

  async function removeTag(tag: string) {
    const previous = item.tags;
    const next = item.tags.filter((tg) => tg !== tag);
    setItem((prev) => ({ ...prev, tags: next }));
    try {
      await updateCollectionItemTags(item.item_group_id, next);
    } catch {
      setItem((prev) => ({ ...prev, tags: previous }));
      toast.error(t("collection_item_detail_error_save_tags"));
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await removeCollectionItem(item.id);
      router.replace(`/collections/${item.collection_id}`);
      router.refresh();
    } catch {
      toast.error(t("collection_item_remove_error"));
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <BackdropHero path={movie?.backdrop_path ?? null} contentClassName="max-w-3xl md:min-h-[24rem]">
        <div className="flex items-end gap-5">
          <Link href={`/films/${item.tmdb_movie_id}`} className="group shrink-0">
            <Poster path={item.movie_poster} title={item.movie_title} size="lg" priority hover className="w-28 sm:w-36" />
          </Link>
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-balance md:text-4xl">
              {item.movie_title}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="default">{item.type}</Badge>
              <Badge variant="secondary">{item.editie}</Badge>
              {item.watched && <Badge variant="success">{t("watched_label")}</Badge>}
              {item.box_name && <Badge variant="outline">{t("collection_item_box_caption", item.box_name)}</Badge>}
            </div>
            <p className="font-mono text-xs text-muted-foreground">{item.barcode}</p>
          </div>
        </div>
      </BackdropHero>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">

      {movie?.overview && (
        <div>
          <h2 className="mb-2 font-display text-xl font-semibold tracking-tight">{t("collection_item_detail_synopsis_title")}</h2>
          <p className="leading-relaxed text-foreground/90">{movie.overview}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("collection_item_detail_data_title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <StarRating value={item.rating} onChange={setRating} />

          <div className="flex items-center gap-3">
            <Button variant={item.watched ? "default" : "outline"} size="sm" onClick={toggleWatched}>
              {item.watched ? t("watched_label") : t("not_watched_label")}
            </Button>
            <Button variant={item.is_favorite ? "default" : "outline"} size="sm" onClick={toggleFavorite}>
              {item.is_favorite ? t("favorite_label") : t("not_favorite_label")}
            </Button>
          </div>

          <div className="w-48">
            <p className="mb-1 text-sm font-medium">{t("collection_item_detail_condition_label")}</p>
            <Select value={item.condition ?? "none"} onValueChange={(v) => setCondition(v === "none" ? null : (v as Condition))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("collection_item_detail_condition_none")}</SelectItem>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("collection_item_detail_personal_title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            {item.loaned_to ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm">
                  {t("collection_item_detail_loan_loaned_to", item.loaned_to, item.loaned_at?.slice(0, 10) ?? "")}
                </p>
                <Button variant="outline" size="sm" onClick={markReturned} className="w-fit">
                  {t("collection_item_detail_loan_return_button")}
                </Button>
                {isLoanOverdue(item) && (
                  <p className="text-sm text-destructive">
                    {t("collection_item_detail_loan_overdue", item.loaned_to ?? "")}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">{t("collection_item_detail_loan_not_loaned")}</p>
                <Button variant="outline" size="sm" onClick={() => setShowLoanDialog(true)}>
                  {t("collection_item_detail_loan_button")}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{t("collection_item_detail_note_label")}</p>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" className="w-fit" onClick={saveNote}>
              {t("collection_item_detail_note_save_button")}
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{t("collection_item_detail_tags_label")}</p>
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                  {tag}
                  <button onClick={() => removeTag(tag)} aria-label={t("action_delete")}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t("collection_item_detail_tag_add_label")}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
              />
              <Button variant="outline" onClick={addTag}>
                {t("action_add")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
        {t("collection_item_detail_delete_button")}
      </Button>

      <Dialog open={showLoanDialog} onOpenChange={setShowLoanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("collection_item_detail_loan_dialog_title")}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t("collection_item_detail_loan_name_label")}
            value={loanName}
            onChange={(e) => setLoanName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoanDialog(false)}>
              {t("action_cancel")}
            </Button>
            <Button onClick={markLoaned} disabled={!loanName.trim()}>
              {t("collection_item_detail_loan_button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("collection_item_delete_title")}</DialogTitle>
            <DialogDescription>{t("collection_item_delete_confirm_text", item.movie_title)}</DialogDescription>
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
      </div>
    </div>
  );
}
