"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Award, CalendarDays, Disc3, Eye, Film, LibraryBig, Share2, Star } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { createPost } from "@/actions/posts";
import type { Collection, CollectionItem, UserBadge } from "@/types/database";
import { StatTile } from "@/components/stat-tile";
import { EmptyState } from "@/components/empty-state";
import { Poster } from "@/components/movie/poster";
import { PosterRail, RailItem } from "@/components/movie/poster-rail";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function yearOf(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const year = Number.parseInt(isoDate.slice(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

function monthOf(isoDate: string | null): number | null {
  if (!isoDate || isoDate.length < 7) return null;
  const month = Number.parseInt(isoDate.slice(5, 7), 10);
  return Number.isNaN(month) ? null : month;
}

function monthName(month: number, locale: string): string {
  return new Date(2000, month - 1, 1).toLocaleDateString(locale === "nl" ? "nl-NL" : "en-US", { month: "long" });
}

/** Deliberately scoped to data already stored (no per-film TMDB genre lookups) — mirrors
 * recap/YearlyRecapViewModel.kt's Android implementation exactly, including the same
 * "alreadyWatched = of films added that year, how many are marked watched NOW" caveat (there's
 * no watched-at timestamp, so this isn't "watched during that year"). */
export function YearlyRecapClient({
  collections,
  items,
  badges,
}: {
  collections: Collection[];
  items: CollectionItem[];
  badges: UserBadge[];
}) {
  const { t, locale } = useT();
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    items.forEach((i) => { const y = yearOf(i.added_at); if (y) years.add(y); });
    collections.forEach((c) => { const y = yearOf(c.created_at); if (y) years.add(y); });
    badges.forEach((b) => { const y = yearOf(b.earned_at); if (y) years.add(y); });
    return Array.from(years).sort((a, b) => b - a);
  }, [items, collections, badges, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recap = useMemo(() => {
    const itemsThatYear = items.filter((i) => yearOf(i.added_at) === selectedYear);
    const ratings = itemsThatYear.map((i) => i.rating).filter((r): r is number => r !== null);

    const typeCounts = new Map<string, number>();
    itemsThatYear.forEach((i) => typeCounts.set(i.type, (typeCounts.get(i.type) ?? 0) + 1));
    const topType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const monthCounts = new Map<number, number>();
    itemsThatYear.forEach((i) => {
      const m = monthOf(i.added_at);
      if (m) monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1);
    });
    const busiestMonth = [...monthCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      itemsThatYear: [...itemsThatYear].sort((a, b) => (a.added_at ?? "").localeCompare(b.added_at ?? "")),
      filmsAdded: itemsThatYear.length,
      alreadyWatched: itemsThatYear.filter((i) => i.watched).length,
      averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      topType,
      busiestMonth,
      newCollections: collections.filter((c) => yearOf(c.created_at) === selectedYear).length,
      badgesEarned: badges.filter((b) => yearOf(b.earned_at) === selectedYear).length,
    };
  }, [items, collections, badges, selectedYear]);

  async function handleShare() {
    setIsSharing(true);
    setError(null);
    const ratingText = recap.averageRating != null ? `★ ${recap.averageRating.toFixed(1)}` : t("yearly_recap_no_ratings");
    const monthText = recap.busiestMonth != null ? monthName(recap.busiestMonth, locale) : t("yearly_recap_value_unknown");
    const title = t("yearly_recap_share_title", selectedYear);
    const body = t(
      "yearly_recap_share_body",
      selectedYear,
      recap.filmsAdded,
      recap.alreadyWatched,
      ratingText,
      monthText,
      recap.badgesEarned,
    );
    try {
      await createPost(title, body, null, null, null, null);
      setShareSuccess(true);
      toast.success(t("yearly_recap_share_success"));
    } catch {
      setError(t("yearly_recap_share_error"));
      toast.error(t("yearly_recap_share_error"));
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-cinema -mx-4 -mt-4 flex flex-col gap-4 px-4 pb-8 pt-10 md:-mx-8 md:-mt-8 md:px-8 md:pt-14">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">{t("yearly_recap_title")}</p>
            <p className="font-display text-7xl font-semibold leading-none tracking-tight md:text-8xl">{selectedYear}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => {
                setSelectedYear(Number(v));
                setShareSuccess(false);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleShare} disabled={isSharing || shareSuccess}>
              <Share2 />
              {t("yearly_recap_share_button")}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {recap.filmsAdded === 0 ? (
          <EmptyState icon={CalendarDays} title={t("yearly_recap_empty", selectedYear)} />
        ) : (
          <PosterRail title={t("yearly_recap_films_added")}>
            {recap.itemsThatYear.map((item) => (
              <RailItem key={item.id}>
                <Link href={`/collections/${item.collection_id}/items/${item.id}`} className="group block focus-visible:outline-none">
                  <Poster path={item.movie_poster} title={item.movie_title} size="sm" hover />
                </Link>
              </RailItem>
            ))}
          </PosterRail>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile icon={Film} label={t("yearly_recap_films_added")} value={recap.filmsAdded} />
          <StatTile
            icon={Eye}
            label={t("yearly_recap_already_watched")}
            value={t("yearly_recap_watched_of_total", recap.alreadyWatched, recap.filmsAdded)}
          />
          <StatTile
            icon={Star}
            label={t("yearly_recap_average_rating")}
            value={recap.averageRating != null ? recap.averageRating.toFixed(1) : "–"}
          />
          <StatTile icon={Disc3} label={t("yearly_recap_top_type")} value={recap.topType ?? "–"} />
          <StatTile
            icon={CalendarDays}
            label={t("yearly_recap_busiest_month")}
            value={<span className="capitalize">{recap.busiestMonth != null ? monthName(recap.busiestMonth, locale) : "–"}</span>}
          />
          <StatTile icon={LibraryBig} label={t("yearly_recap_new_collections")} value={recap.newCollections} />
          <StatTile icon={Award} label={t("yearly_recap_badges_earned")} value={recap.badgesEarned} />
        </div>
      </div>
    </div>
  );
}
