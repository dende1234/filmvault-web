"use client";

import { useEffect, useState } from "react";
import { titleHref } from "@/lib/titles";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Captions, Check, Eye, Plus, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { editionLabel } from "@/lib/edition-label";
import { removeCollectionItem, updateCollectionItemCondition, updateCollectionItemFavorite, updateCollectionItemLoan, updateCollectionItemNote, updateCollectionItemSeasons, updateCollectionItemRating, updateCollectionItemTags, updateCollectionItemWatched } from "@/actions/collections";
import { isLoanOverdue, type Collection, type CollectionItem, type Condition, type FilmLog, type FilmViewing } from "@/types/database";
import { setFilmRating, setFilmReview, setFilmWatched } from "@/actions/watched";
import { LogFilmDialog } from "@/components/watched/log-film-dialog";
import { getSeriesSeasons, type SeasonOption } from "@/actions/series";
import { isSeries } from "@/lib/titles";
import { SeasonsPicker, useSeasonsLabel } from "@/components/seasons-picker";
import { CoverUpload } from "@/components/cover-upload";
import { CopyCollections } from "@/components/copy-collections";
import { CopyDetails } from "@/components/copy-details";
import { PurchaseDetails } from "@/components/purchase-details";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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

export function CollectionItemEditor({
  item: initial,
  movie,
  filmLog,
  collections,
  copyCollectionIds,
}: {
  item: CollectionItem;
  movie: MovieDetailDto | null;
  filmLog: { log: FilmLog | null; viewings: FilmViewing[] };
  /** All of the user's collections, and the ones this copy (or box) is in. */
  collections: Collection[];
  copyCollectionIds: string[];
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const [item, setItem] = useState(initial);
  const [note, setNote] = useState(initial.personal_note ?? "");
  const [newTag, setNewTag] = useState("");
  const [loanName, setLoanName] = useState("");
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [review, setReview] = useState(filmLog.log?.review ?? "");
  const [shareReview, setShareReview] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const filmMeta = { tmdbMovieId: initial.tmdb_movie_id, title: initial.movie_title, poster: initial.movie_poster };
  const series = isSeries(initial.tmdb_movie_id);
  const seasonsLabel = useSeasonsLabel();
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([]);
  const [seasons, setSeasons] = useState<number[]>(initial.seasons ?? []);
  const [isSavingSeasons, setIsSavingSeasons] = useState(false);
  const regularTotal = seasonOptions.filter((o) => o.seasonNumber > 0).length;

  useEffect(() => {
    if (!series) return;
    getSeriesSeasons(initial.tmdb_movie_id).then(setSeasonOptions).catch(() => {});
  }, [series, initial.tmdb_movie_id]);

  async function saveSeasons() {
    setIsSavingSeasons(true);
    try {
      await updateCollectionItemSeasons(item.item_group_id, seasons);
      setItem((prev) => ({ ...prev, seasons }));
      toast.success(t("watched_saved"));
      router.refresh();
    } catch {
      toast.error(t("watched_error"));
    } finally {
      setIsSavingSeasons(false);
    }
  }

  // After router.refresh() the server sends the synced watched/rating (and
  // review) — adopt them during render instead of in an effect.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setItem((prev) => ({ ...prev, watched: initial.watched, rating: initial.rating }));
  }
  const [prevReview, setPrevReview] = useState(filmLog.log?.review ?? "");
  if ((filmLog.log?.review ?? "") !== prevReview) {
    setPrevReview(filmLog.log?.review ?? "");
    setReview(filmLog.log?.review ?? "");
  }

  async function setRating(rating: number) {
    const previous = item.rating;
    setItem((prev) => ({ ...prev, rating }));
    try {
      // Rating belongs to the film (all copies); before watched_films.sql has
      // run, fall back to the old per-copy update.
      const result = await setFilmRating(filmMeta, rating);
      if (result.error) await updateCollectionItemRating(item.item_group_id, rating);
      router.refresh();
    } catch {
      setItem((prev) => ({ ...prev, rating: previous }));
      toast.error(t("collection_item_detail_error_save_rating"));
    }
  }

  async function toggleWatched() {
    const next = !item.watched;
    setItem((prev) => ({ ...prev, watched: next }));
    try {
      const result = await setFilmWatched(filmMeta, next);
      if (result.error) await updateCollectionItemWatched(item.item_group_id, next);
      router.refresh();
    } catch {
      setItem((prev) => ({ ...prev, watched: !next }));
      toast.error(t("collection_item_detail_error_save_watched"));
    }
  }

  async function saveReview() {
    setIsSavingReview(true);
    try {
      const result = await setFilmReview(filmMeta, review, shareReview && !filmLog.log?.review_post_id);
      if (result.error) toast.error(t("watched_error"));
      else {
        toast.success(t("watched_saved"));
        setShareReview(false);
        router.refresh();
      }
    } finally {
      setIsSavingReview(false);
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
          <Link href={titleHref(item.tmdb_movie_id)} className="group shrink-0">
            <Poster path={item.movie_poster} customCover={item.custom_cover_path} title={item.movie_title} size="lg" priority hover className="w-28 sm:w-36" />
          </Link>
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-balance md:text-4xl">
              {item.movie_title}
            </h1>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="default">{item.type}</Badge>
              <Badge variant="secondary">{editionLabel(item.editie, locale)}</Badge>
              {series && <Badge variant="secondary">{seasonsLabel(item.seasons, regularTotal)}</Badge>}
              {initial.cut && <Badge variant="secondary">{initial.cut}</Badge>}
              {initial.label && <Badge variant="secondary">{initial.label}</Badge>}
              {initial.region && (
                <Badge variant="secondary">
                  {initial.region === "Regiovrij" ? t("details_region_free") : t("details_region_value", initial.region)}
                </Badge>
              )}
              {!!initial.audio_languages?.length && (
                <Badge variant="outline" title={t("details_audio")}>
                  <Volume2 aria-hidden />
                  {initial.audio_languages.map((c) => c.toUpperCase()).join(" · ")}
                </Badge>
              )}
              {!!initial.subtitle_languages?.length && (
                <Badge variant="outline" title={t("details_subtitles")}>
                  <Captions aria-hidden />
                  {initial.subtitle_languages.map((c) => c.toUpperCase()).join(" · ")}
                </Badge>
              )}
              {item.watched && <Badge variant="success">{t("watched_label")}</Badge>}
              {item.box_name &&
                (item.box_group_id ? (
                  <Link href={`/collections/${item.collection_id}/boxes/${item.box_group_id}`}>
                    <Badge variant="outline" className="hover:text-primary hover:ring-primary/50">
                      {t("collection_item_box_caption", item.box_name)}
                    </Badge>
                  </Link>
                ) : (
                  <Badge variant="outline">{t("collection_item_box_caption", item.box_name)}</Badge>
                ))}
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
          <CardTitle>{t("details_title")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("details_hint")}</p>
        </CardHeader>
        <CardContent>
          <CopyDetails
            key={[initial.cut, initial.label, initial.region, initial.audio_languages?.join(","), initial.subtitle_languages?.join(",")].join("|")}
            item={initial}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("purchase_title")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("purchase_hint")}</p>
        </CardHeader>
        <CardContent>
          <PurchaseDetails key={[initial.purchase_price, initial.purchase_date, initial.purchase_shop].join("|")} item={initial} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("copy_collections_title")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("copy_collections_hint")}</p>
        </CardHeader>
        <CardContent>
          <CopyCollections
            key={copyCollectionIds.slice().sort().join(",")}
            itemId={item.id}
            isBox={item.is_box}
            collections={collections}
            initialIds={copyCollectionIds}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("cover_title")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("cover_hint")}</p>
        </CardHeader>
        <CardContent>
          <CoverUpload itemGroupId={item.item_group_id} hasCustomCover={!!initial.custom_cover_path} />
        </CardContent>
      </Card>

      {series && (
        <Card>
          <CardHeader>
            <CardTitle>{t("series_copy_seasons_title")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("series_pick_seasons")}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <SeasonsPicker seasons={seasonOptions} value={seasons} onChange={setSeasons} />
            <Button
              size="sm"
              className="w-fit"
              onClick={saveSeasons}
              disabled={isSavingSeasons || JSON.stringify(seasons) === JSON.stringify(item.seasons ?? [])}
            >
              {t("action_save")}
            </Button>
          </CardContent>
        </Card>
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
          <CardTitle>{t("watched_review_card_title")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("watched_scope_hint")}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="item-review">{t("watched_dialog_review")}</Label>
            <Textarea
              id="item-review"
              rows={4}
              value={review}
              maxLength={10000}
              onChange={(e) => setReview(e.target.value)}
              placeholder={t("watched_dialog_review_placeholder")}
            />
            {filmLog.log?.review_post_id ? (
              <p className="flex items-center gap-1.5 text-xs text-success">
                <Check className="size-3.5" />
                {t("watched_dialog_shared")}
                <Link href={`/feed/${filmLog.log.review_post_id}`} className="font-medium text-primary hover:underline">
                  {t("watched_dialog_view_post")}
                </Link>
              </p>
            ) : (
              <div className="flex items-center gap-3">
                <Checkbox
                  id="item-share"
                  checked={shareReview}
                  disabled={review.trim().length === 0}
                  onCheckedChange={(v) => setShareReview(v === true)}
                />
                <Label htmlFor="item-share" className="font-normal">
                  {t("watched_dialog_share")}
                </Label>
              </div>
            )}
            <Button
              size="sm"
              className="w-fit"
              onClick={saveReview}
              disabled={isSavingReview || review.trim() === (filmLog.log?.review ?? "").trim()}
            >
              {t("action_save")}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="size-4 text-primary" />
              {t("watched_viewings_count", filmLog.viewings.length)}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setShowLogDialog(true)}>
              <Plus />
              {t("watched_add_viewing")}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/watched">{t("watched_view_all")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <LogFilmDialog open={showLogDialog} onOpenChange={setShowLogDialog} meta={filmMeta} log={filmLog.log} mode="log" />

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
