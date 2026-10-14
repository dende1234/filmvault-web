"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Plus, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { deleteViewing, setFilmRating, setFilmWatched } from "@/actions/watched";
import type { FilmLog, FilmMeta, FilmViewing } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { LogFilmDialog } from "@/components/watched/log-film-dialog";

export function formatViewingDate(date: string | null, locale: string, unknownLabel: string) {
  if (!date) return unknownLabel;
  // Date-only value: format in UTC so it never shifts a day.
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** "Jouw beoordeling" — the film's rating (editable inline), private review
 * and viewing diary. Same data as in the collection and on /watched. */
export function FilmLogCard({ meta, log, viewings }: { meta: FilmMeta; log: FilmLog | null; viewings: FilmViewing[] }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [dialog, setDialog] = useState<"log" | "edit" | null>(null);
  const [rating, setRating] = useState<number | null>(log?.rating ?? null);
  const [isPending, startTransition] = useTransition();
  // Adopt a rating changed elsewhere (dialog, refresh) — during render, not in an effect.
  const [prevLogRating, setPrevLogRating] = useState(log?.rating ?? null);
  if ((log?.rating ?? null) !== prevLogRating) {
    setPrevLogRating(log?.rating ?? null);
    setRating(log?.rating ?? null);
  }

  // Nothing logged yet: the hero's WatchedButton is the entry point.
  if (!log || (!log.watched && log.rating == null && !log.review)) return null;

  function changeRating(next: number) {
    const previous = rating;
    setRating(next);
    startTransition(async () => {
      const result = await setFilmRating(meta, next);
      if (result.error) {
        setRating(previous);
        toast.error(t("watched_error"));
      } else router.refresh();
    });
  }

  function removeViewing(id: string) {
    startTransition(async () => {
      const result = await deleteViewing(id, meta.tmdbMovieId);
      if (result.error) toast.error(t("watched_error"));
      else router.refresh();
    });
  }

  function unmark() {
    startTransition(async () => {
      const result = await setFilmWatched(meta, false);
      if (result.error) toast.error(t("watched_error"));
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
        <CardTitle>{t("watched_your_rating_title")}</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setDialog("edit")}>
          {t("watched_edit")}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <StarRating value={rating} onChange={changeRating} disabled={isPending} />

        {log.review ? (
          <div className="flex flex-col gap-1.5">
            <p className="line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{log.review}</p>
            {log.review_post_id && (
              <Link href={`/feed/${log.review_post_id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Share2 className="size-3" />
                {t("watched_dialog_shared")}
              </Link>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("watched_no_review")}</p>
        )}

        <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("watched_viewings_title")}</p>
            <Button variant="ghost" size="sm" onClick={() => setDialog("log")}>
              <Plus />
              {t("watched_add_viewing")}
            </Button>
          </div>
          {log.watched && viewings.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {viewings.map((v) => (
                <li key={v.id} className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                  <span className="inline-flex items-center gap-2">
                    <Eye className="size-3.5 text-primary" />
                    {formatViewingDate(v.watched_on, locale, t("watched_diary_unknown_date"))}
                    {v.season_number != null && (
                      <span className="text-muted-foreground">· {v.season_number === 0 ? t("series_specials") : `S${v.season_number}`}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeViewing(v.id)}
                    disabled={isPending}
                    aria-label={t("watched_delete_viewing")}
                    className="rounded-full p-1 text-muted-foreground transition-opacity hover:bg-destructive/15 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("watched_diary_empty")}</p>
          )}
          {log.watched && (
            <Button variant="ghost" size="sm" className="w-fit text-muted-foreground" onClick={unmark} disabled={isPending}>
              {t("watched_remove")}
            </Button>
          )}
        </div>
      </CardContent>
      <LogFilmDialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)} meta={meta} log={log} mode={dialog ?? "log"} />
    </Card>
  );
}
