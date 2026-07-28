"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useT } from "@/lib/i18n/locale-provider";
import { posterUrl } from "@/types/tmdb";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

function MovieRow({
  movie,
  onClick,
  selected,
}: {
  movie: MovieSummaryDto;
  onClick: () => void;
  selected?: boolean;
}) {
  const poster = posterUrl(movie.poster_path, "w200");
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted"
    >
      {selected !== undefined && <Checkbox checked={selected} className="pointer-events-none" />}
      <div className="relative h-16 w-11 flex-none overflow-hidden rounded-md bg-muted">
        {poster && <Image src={poster} alt="" fill className="object-cover" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{movie.title}</p>
        {movie.release_date && <p className="text-xs text-muted-foreground">{movie.release_date.slice(0, 4)}</p>}
      </div>
    </button>
  );
}

/** Single-select movie picker — mirrors movies/MovieSearchPickerDialog.kt. */
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
  const [movies, setMovies] = useState<MovieSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsLoading(true);
      const params = new URLSearchParams({ query, language: locale });
      fetch(`/api/tmdb/search?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => setMovies(data.results ?? []))
        .finally(() => setIsLoading(false));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, locale]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("movie_picker_title")}</DialogTitle>
        </DialogHeader>
        <Input placeholder={t("movies_search_label")} value={query} onChange={(e) => setQuery(e.target.value)} />
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
  const [movies, setMovies] = useState<MovieSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Map<number, MovieSummaryDto>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setIsLoading(true);
      const params = new URLSearchParams({ query, language: locale });
      fetch(`/api/tmdb/search?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => setMovies(data.results ?? []))
        .finally(() => setIsLoading(false));
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, locale]);

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
        <Input placeholder={t("movies_search_label")} value={query} onChange={(e) => setQuery(e.target.value)} />
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
