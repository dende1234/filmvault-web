"use client";

import { useMemo, useState } from "react";
import { isSeries, titleHref } from "@/lib/titles";
import Link from "next/link";
import { CalendarDays, Eye, LibraryBig, MessageSquare, Plus, SearchX, Star } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import type { DiaryEntry, FilmMeta, WatchedFilmItem } from "@/types/database";
import type { MovieSummaryDto } from "@/types/tmdb";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { EmptyState } from "@/components/empty-state";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { LogFilmDialog } from "@/components/watched/log-film-dialog";
import { formatViewingDate } from "@/components/watched/film-log-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Filter = "all" | "in" | "out" | "movie" | "tv";
type Sort = "recent" | "rating" | "title";

/** Month heading key for the diary: "2026-10", or "unknown" for undated. */
function monthKey(date: string | null) {
  return date ? date.slice(0, 7) : "unknown";
}

export function WatchedPageClient({ available, films, diary }: { available: boolean; films: WatchedFilmItem[]; diary: DiaryEntry[] }) {
  const { t, locale } = useT();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [logTarget, setLogTarget] = useState<FilmMeta | null>(null);

  const year = new Date().getFullYear();
  const viewingsThisYear = diary.filter((d) => d.watched_on?.startsWith(String(year))).length;
  const rated = films.filter((f) => f.rating != null);
  const avgRating = rated.length > 0 ? rated.reduce((sum, f) => sum + (f.rating ?? 0), 0) / rated.length : null;

  const visibleFilms = useMemo(() => {
    let list = films;
    if (filter === "in") list = list.filter((f) => f.inCollection);
    if (filter === "out") list = list.filter((f) => !f.inCollection);
    if (filter === "movie") list = list.filter((f) => !isSeries(f.tmdb_movie_id));
    if (filter === "tv") list = list.filter((f) => isSeries(f.tmdb_movie_id));
    const copy = [...list];
    if (sort === "title") copy.sort((a, b) => a.movie_title.localeCompare(b.movie_title));
    else if (sort === "rating") copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else copy.sort((a, b) => (b.lastWatchedOn ?? b.updated_at).localeCompare(a.lastWatchedOn ?? a.updated_at));
    return copy;
  }, [films, filter, sort]);

  const diaryByMonth = useMemo(() => {
    const groups = new Map<string, DiaryEntry[]>();
    for (const entry of diary) {
      const key = monthKey(entry.watched_on);
      groups.set(key, [...(groups.get(key) ?? []), entry]);
    }
    // Months newest first; undated viewings last.
    return [...groups.entries()].sort(([a], [b]) => (a === "unknown" ? 1 : b === "unknown" ? -1 : b.localeCompare(a)));
  }, [diary]);

  function monthLabel(key: string) {
    if (key === "unknown") return t("watched_diary_unknown_date");
    return new Date(`${key}-01T00:00:00Z`).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  }

  function openLogFor(movie: MovieSummaryDto) {
    setPickerOpen(false);
    setLogTarget({ tmdbMovieId: movie.id, title: movie.title, poster: movie.poster_path });
  }

  const existingLog = logTarget ? (films.find((f) => f.tmdb_movie_id === logTarget.tmdbMovieId) ?? null) : null;
  const addButton = (
    <Button onClick={() => setPickerOpen(true)} disabled={!available}>
      <Plus />
      {t("watched_add_button")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("watched_title")} description={t("watched_subtitle")} actions={addButton} />

      {!available ? (
        <EmptyState icon={Eye} title={t("watched_not_ready_title")} description={t("watched_not_ready_description")} />
      ) : films.length === 0 ? (
        <EmptyState icon={Eye} title={t("watched_empty_title")} description={t("watched_empty_description")} action={addButton} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={Eye} label={t("watched_stat_films")} value={films.length} />
            <StatTile icon={CalendarDays} label={t("watched_stat_viewings_year", year)} value={viewingsThisYear} />
            <StatTile icon={Star} label={t("watched_stat_avg_rating")} value={avgRating != null ? avgRating.toFixed(1) : "–"} />
            <StatTile icon={LibraryBig} label={t("watched_stat_in_collection")} value={films.filter((f) => f.inCollection).length} />
          </div>

          <Tabs defaultValue="films">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="films">{t("watched_tab_films")}</TabsTrigger>
                <TabsTrigger value="diary">{t("watched_tab_diary")}</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="films" className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-2">
                <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filter_all_films")}</SelectItem>
                    <SelectItem value="in">{t("watched_filter_in_collection")}</SelectItem>
                    <SelectItem value="out">{t("watched_filter_not_in_collection")}</SelectItem>
                    <SelectItem value="movie">{t("picker_kind_movies")}</SelectItem>
                    <SelectItem value="tv">{t("picker_kind_series")}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">{t("watched_sort_recent")}</SelectItem>
                    <SelectItem value="rating">{t("sort_rating")}</SelectItem>
                    <SelectItem value="title">{t("watched_sort_title")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {visibleFilms.length === 0 ? (
                <EmptyState icon={SearchX} title={t("watched_no_matches")} />
              ) : (
                <PosterGrid>
                  {visibleFilms.map((film) => (
                    <Link key={film.id} href={titleHref(film.tmdb_movie_id)} className="group flex flex-col gap-2 focus-visible:outline-none">
                      <Poster path={film.movie_poster} title={film.movie_title} hover>
                        {film.rating != null && (
                          <PosterCorner position="tl">
                            <Badge variant="overlay">
                              <Star className="fill-current text-primary" />
                              {film.rating.toFixed(1)}
                            </Badge>
                          </PosterCorner>
                        )}
                        <PosterCorner position="bl">
                          {film.inCollection && (
                            <Badge variant="overlay" title={t("watched_in_collection_badge")} className="px-1.5">
                              <LibraryBig />
                            </Badge>
                          )}
                          {film.review && (
                            <Badge variant="overlay" title={t("watched_has_review")} className="px-1.5">
                              <MessageSquare />
                            </Badge>
                          )}
                        </PosterCorner>
                        {film.viewingCount > 1 && (
                          <PosterCorner position="tr">
                            <Badge variant="overlay">{t("watched_times", film.viewingCount)}</Badge>
                          </PosterCorner>
                        )}
                      </Poster>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">{film.movie_title}</p>
                        {film.lastWatchedOn && (
                          <p className="text-xs text-muted-foreground">{formatViewingDate(film.lastWatchedOn, locale, "")}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </PosterGrid>
              )}
            </TabsContent>

            <TabsContent value="diary">
              {diary.length === 0 ? (
                <EmptyState icon={CalendarDays} title={t("watched_diary_empty")} />
              ) : (
                <div className="flex flex-col gap-8">
                  {diaryByMonth.map(([key, entries]) => (
                    <section key={key} className="flex flex-col gap-2">
                      <h2 className="font-display text-xl font-semibold capitalize tracking-tight">{monthLabel(key)}</h2>
                      <ol className="flex flex-col divide-y divide-border/60 rounded-card border border-border/70 bg-card">
                        {entries.map((entry) => (
                          <li key={entry.id}>
                            <Link
                              href={titleHref(entry.tmdb_movie_id)}
                              className="group flex items-center gap-4 p-3 transition-colors hover:bg-elevated/60"
                            >
                              <span className="w-12 shrink-0 text-center">
                                {entry.watched_on ? (
                                  <span className="block font-display text-2xl font-semibold leading-none tabular-nums">
                                    {Number(entry.watched_on.slice(8, 10))}
                                  </span>
                                ) : (
                                  <span className="block text-lg text-muted-foreground">?</span>
                                )}
                              </span>
                              <Poster path={entry.movie_poster} title={entry.movie_title} size="xs" className="w-10 shrink-0 rounded-md shadow-none" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium transition-colors group-hover:text-primary">{entry.movie_title}</p>
                                {(entry.isRewatch || entry.season_number != null) && (
                                  <p className="text-xs text-muted-foreground">
                                    {entry.season_number != null && (entry.season_number === 0 ? t("series_specials") : `S${entry.season_number}`)}
                                    {entry.season_number != null && entry.isRewatch && " · "}
                                    {entry.isRewatch && t("watched_diary_rewatch")}
                                  </p>
                                )}
                              </div>
                              {entry.rating != null && (
                                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                                  <Star className="size-3.5 fill-current" />
                                  {entry.rating.toFixed(1)}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </section>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <MovieSearchPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={openLogFor} />
      {logTarget && (
        <LogFilmDialog
          open={logTarget !== null}
          onOpenChange={(o) => !o && setLogTarget(null)}
          meta={logTarget}
          log={existingLog}
          mode="log"
        />
      )}
    </div>
  );
}
