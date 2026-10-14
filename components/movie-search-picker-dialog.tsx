"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/locale-provider";
import { Poster } from "@/components/movie/poster";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { TitleKind } from "@/lib/titles";

function MovieRow({
  movie,
  onClick,
  selected,
}: {
  movie: MovieSummaryDto;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
    >
      {selected !== undefined && <Checkbox checked={selected} className="pointer-events-none" />}
      <Poster path={movie.poster_path} title={movie.title} size="xs" className="w-11 shrink-0 rounded-md shadow-none" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{movie.title}</p>
        {movie.release_date && <p className="text-xs text-muted-foreground">{movie.release_date.slice(0, 4)}</p>}
      </div>
    </button>
  );
}

/** "Films | Series" switch shared by both pickers. */
function KindToggle({ kind, onChange }: { kind: TitleKind; onChange: (k: TitleKind) => void }) {
  const { t } = useT();
  return (
    <div role="group" aria-label={t("picker_kind_label")} className="inline-flex w-fit rounded-full border border-border bg-card p-0.5 text-sm">
      {(["movie", "tv"] as const).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={kind === k}
          onClick={() => onChange(k)}
          className={cn(
            "rounded-full px-3 py-1 font-medium transition-colors",
            kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(k === "movie" ? "picker_kind_movies" : "picker_kind_series")}
        </button>
      ))}
    </div>
  );
}

/** Single-select movie/series picker — mirrors movies/MovieSearchPickerDialog.kt.
 * A series comes back film-shaped with a negative id (lib/titles.ts). */
export function MovieSearchPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (movie: MovieSummaryDto) => void;
}) {
  const { t, locale } = useT();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<TitleKind>("movie");
  const [movies, setMovies] = useState<MovieSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsLoading(true);
      const params = new URLSearchParams({ query, language: locale, type: kind });
      fetch(`/api/tmdb/search?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => setMovies(data.results ?? []))
        .finally(() => setIsLoading(false));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, locale, kind]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("movie_picker_title")}</DialogTitle>
        </DialogHeader>
        <KindToggle kind={kind} onChange={setKind} />
        <SearchInput placeholder={t("movies_search_label")} value={query} onValueChange={setQuery} />
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">…</p>
          ) : movies.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("movies_empty_results")}</p>
          ) : (
            movies.map((m) => <MovieRow key={m.id} movie={m} onClick={() => onSelect(m)} />)
          )}
        </div>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t("action_cancel")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** Multi-select variant used to build a film box — mirrors MovieMultiSelectPickerDialog.kt. */
export function MovieMultiSelectPickerDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (movies: MovieSummaryDto[]) => void;
}) {
  const { t, locale } = useT();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<TitleKind>("movie");
  const [movies, setMovies] = useState<MovieSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Map<number, MovieSummaryDto>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsLoading(true);
      const params = new URLSearchParams({ query, language: locale, type: kind });
      fetch(`/api/tmdb/search?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => setMovies(data.results ?? []))
        .finally(() => setIsLoading(false));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, locale, kind]);

  function toggle(movie: MovieSummaryDto) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(movie.id)) next.delete(movie.id);
      else next.set(movie.id, movie);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("box_movie_picker_title")}</DialogTitle>
        </DialogHeader>
        <KindToggle kind={kind} onChange={setKind} />
        <SearchInput placeholder={t("movies_search_label")} value={query} onValueChange={setQuery} />
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">…</p>
          ) : movies.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("movies_empty_results")}</p>
          ) : (
            movies.map((m) => (
              <MovieRow key={m.id} movie={m} selected={selected.has(m.id)} onClick={() => toggle(m)} />
            ))
          )}
        </div>
        {selected.size > 0 && (
          <p className="text-xs text-muted-foreground">{t("box_movie_picker_selected_title", selected.size)}</p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            {t("action_cancel")}
          </Button>
          <Button
            className="flex-1"
            disabled={selected.size === 0}
            onClick={() => {
              onConfirm(Array.from(selected.values()));
              setSelected(new Map());
            }}
          >
            {t("box_movie_picker_confirm_button", selected.size)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
