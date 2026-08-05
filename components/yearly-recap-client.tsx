"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { createPost } from "@/actions/posts";
import type { Collection, CollectionItem, UserBadge } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("yearly_recap_title")}</h1>

      <Select value={String(selectedYear)} onValueChange={(v) => { setSelectedYear(Number(v)); setShareSuccess(false); }}>
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

      <div className="grid grid-cols-2 gap-3">
        <RecapStat label={t("yearly_recap_films_added")} value={String(recap.filmsAdded)} />
        <RecapStat
          label={t("yearly_recap_already_watched")}
          value={t("yearly_recap_watched_of_total", recap.alreadyWatched, recap.filmsAdded)}
        />
        <RecapStat
          label={t("yearly_recap_average_rating")}
          value={recap.averageRating != null ? `★ ${recap.averageRating.toFixed(1)}` : t("yearly_recap_no_ratings")}
        />
        {recap.topType && <RecapStat label={t("yearly_recap_top_type")} value={recap.topType} />}
        {recap.busiestMonth != null && (
          <RecapStat label={t("yearly_recap_busiest_month")} value={monthName(recap.busiestMonth, locale)} />
        )}
        <RecapStat label={t("yearly_recap_new_collections")} value={String(recap.newCollections)} />
        <RecapStat label={t("yearly_recap_badges_earned")} value={String(recap.badgesEarned)} />
      </div>

      <Button variant="outline" className="w-fit" onClick={handleShare} disabled={isSharing}>
        {t("yearly_recap_share_button")}
      </Button>

      {shareSuccess && <p className="text-sm text-primary">{t("yearly_recap_share_success")}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function RecapStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
