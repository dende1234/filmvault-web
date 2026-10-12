"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { logFilm } from "@/actions/watched";
import type { FilmLog, FilmMeta } from "@/types/database";
import { Poster } from "@/components/movie/poster";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/ui/star-rating";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Bekeken" dialog — the one place to log a viewing and set the film's
 * rating + private review (shared by the film page, collection item and
 * the /watched page). `mode="log"` adds a diary entry; `mode="edit"` only
 * edits rating/review (the viewing checkbox starts unchecked). */
export function LogFilmDialog({
  open,
  onOpenChange,
  meta,
  log,
  mode = "log",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: FilmMeta;
  log: FilmLog | null;
  mode?: "log" | "edit";
  onSaved?: () => void;
}) {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("watched_dialog_title")}</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open, so every opening starts from the saved values. */}
        {open && (
          <LogFilmForm
            meta={meta}
            log={log}
            mode={mode}
            onDone={() => {
              onOpenChange(false);
              onSaved?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LogFilmForm({ meta, log, mode, onDone }: { meta: FilmMeta; log: FilmLog | null; mode: "log" | "edit"; onDone: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const [addViewing, setAddViewing] = useState(mode === "log");
  const [watchedOn, setWatchedOn] = useState(todayLocal);
  const [dateUnknown, setDateUnknown] = useState(false);
  const [rating, setRating] = useState<number | null>(log?.rating ?? null);
  const [review, setReview] = useState(log?.review ?? "");
  const [share, setShare] = useState(false);
  const [isPending, startTransition] = useTransition();
  const alreadyShared = !!log?.review_post_id;

  function save() {
    startTransition(async () => {
      const result = await logFilm({
        ...meta,
        addViewing,
        watchedOn: dateUnknown ? null : watchedOn,
        rating,
        review,
        shareToFeed: share && !alreadyShared && review.trim().length > 0,
      });
      if (result.error) {
        toast.error(t("watched_error"));
        return;
      }
      toast.success(t("watched_saved"));
      router.refresh();
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Poster path={meta.poster} title={meta.title} size="xs" className="w-12 shrink-0 rounded-md" />
        <p className="font-display text-lg font-semibold leading-tight">{meta.title}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card p-3">
        <div className="flex items-center gap-3">
          <Checkbox id="add-viewing" checked={addViewing} onCheckedChange={(v) => setAddViewing(v === true)} />
          <Label htmlFor="add-viewing">{t("watched_dialog_log_viewing")}</Label>
        </div>
        {addViewing && (
          <div className="flex flex-wrap items-center gap-3 pl-8">
            <Input
              type="date"
              value={watchedOn}
              max={todayLocal()}
              disabled={dateUnknown}
              onChange={(e) => setWatchedOn(e.target.value)}
              className="w-44"
              aria-label={t("watched_dialog_log_viewing")}
            />
            <div className="flex items-center gap-2">
              <Checkbox id="date-unknown" checked={dateUnknown} onCheckedChange={(v) => setDateUnknown(v === true)} />
              <Label htmlFor="date-unknown" className="font-normal text-muted-foreground">
                {t("watched_dialog_date_unknown")}
              </Label>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">{t("watched_dialog_rating")}</p>
        <div className="flex items-center gap-3">
          <StarRating value={rating} onChange={setRating} />
          {rating != null && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setRating(null)}>
              {t("watched_dialog_clear_rating")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="review">{t("watched_dialog_review")}</Label>
        <Textarea
          id="review"
          rows={4}
          value={review}
          maxLength={10000}
          onChange={(e) => setReview(e.target.value)}
          placeholder={t("watched_dialog_review_placeholder")}
        />
        {alreadyShared ? (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <Check className="size-3.5" />
            {t("watched_dialog_shared")}
            <Link href={`/feed/${log!.review_post_id}`} className="font-medium text-primary hover:underline">
              {t("watched_dialog_view_post")}
            </Link>
          </p>
        ) : (
          <div className="flex items-start gap-3">
            <Checkbox
              id="share"
              checked={share}
              disabled={review.trim().length === 0}
              onCheckedChange={(v) => setShare(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="share" className="flex flex-col gap-0.5 font-normal">
              <span>{t("watched_dialog_share")}</span>
              {review.trim().length === 0 && (
                <span className="text-xs text-muted-foreground">{t("watched_dialog_share_needs_review")}</span>
              )}
            </Label>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} disabled={isPending}>
          {t("action_cancel")}
        </Button>
        <Button onClick={save} disabled={isPending}>
          {t("watched_dialog_save")}
        </Button>
      </div>
    </div>
  );
}
