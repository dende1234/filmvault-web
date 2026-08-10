"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/locale-provider";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GenreDto } from "@/types/tmdb";

const SORT_OPTIONS = [
  { value: "popularity.desc", labelKey: "movies_sort_popularity" as const },
  { value: "vote_average.desc", labelKey: "movies_sort_top_rated" as const },
  { value: "primary_release_date.desc", labelKey: "movies_sort_newest" as const },
];

const ALL = "all";

export function MovieFilters({ genres }: { genres: GenreDto[] }) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearching = (searchParams.get("query") ?? "").trim().length > 0;
  const genre = searchParams.get("genre") ?? ALL;
  const sort = searchParams.get("sort") ?? "popularity.desc";
  const year = searchParams.get("year") ?? ALL;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i);

  function pushParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === ALL) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushParams({ query: value || null }), 400);
  }

  const hasFilters = genre !== ALL || sort !== "popularity.desc" || year !== ALL;

  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        placeholder={t("movies_search_label")}
        value={query}
        onValueChange={handleQueryChange}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select disabled={isSearching} value={genre} onValueChange={(v) => pushParams({ genre: v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("movies_genre_label")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("movies_all_genres")}</SelectItem>
            {genres.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select disabled={isSearching} value={sort} onValueChange={(v) => pushParams({ sort: v })}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("movies_sort_label")} />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select disabled={isSearching} value={year} onValueChange={(v) => pushParams({ year: v })}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t("movies_year_label")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("movies_all_years")}</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && !isSearching && (
          <Button variant="ghost" size="sm" onClick={() => pushParams({ genre: null, sort: null, year: null })}>
            {t("movies_clear_filters")}
          </Button>
        )}
      </div>

      {isSearching && <p className="text-xs text-muted-foreground">{t("movies_filters_disabled_while_searching")}</p>}
    </div>
  );
}
