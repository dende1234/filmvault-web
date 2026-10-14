"use client";

import { useState } from "react";
import { titleHref } from "@/lib/titles";
import Link from "next/link";
import { Bookmark, X } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { removeFromWishlist } from "@/actions/wishlist";
import type { WishlistItem } from "@/types/database";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { isSeries } from "@/lib/titles";
import { useSeasonsLabel } from "@/components/seasons-picker";

export function WishlistClient({ items: initialItems }: { items: WishlistItem[] }) {
  const { t } = useT();
  const [items, setItems] = useState(initialItems);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const seasonsLabel = useSeasonsLabel();

  async function remove(item: WishlistItem) {
    setRemovingIds((prev) => new Set(prev).add(item.id));
    try {
      await removeFromWishlist(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("nav_wishlist")} description={items.length > 0 ? t("wishlist_count", items.length) : undefined} />

      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title={t("wishlist_empty")}
          description={t("wishlist_empty_description")}
          action={
            <Button asChild>
              <Link href="/films">{t("action_discover_films")}</Link>
            </Button>
          }
        />
      ) : (
        <PosterGrid>
          {items.map((item) => (
            <div key={item.id} className="group relative flex flex-col gap-2">
              <Link href={titleHref(item.tmdb_movie_id)} className="flex flex-col gap-2 focus-visible:outline-none">
                <Poster path={item.movie_poster} title={item.movie_title} hover />
                <p className="line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary">
                  {item.movie_title}
                </p>
                {isSeries(item.tmdb_movie_id) && (
                  <p className="-mt-1 text-xs text-muted-foreground">
                    {item.seasons?.length ? seasonsLabel(item.seasons) : t("series_complete")}
                  </p>
                )}
              </Link>
              <PosterCorner position="tr">
                <button
                  type="button"
                  onClick={() => remove(item)}
                  disabled={removingIds.has(item.id)}
                  aria-label={t("action_delete")}
                  className="rounded-full bg-black/70 p-1.5 text-white backdrop-blur-sm transition-opacity hover:bg-destructive focus-visible:opacity-100 disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </PosterCorner>
            </div>
          ))}
        </PosterGrid>
      )}
    </div>
  );
}
