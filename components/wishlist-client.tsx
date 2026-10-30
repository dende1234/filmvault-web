"use client";

import { useState } from "react";
import { titleHref } from "@/lib/titles";
import Link from "next/link";
import { Bookmark, Crown, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { removeFromWishlist, setWishlistGrail } from "@/actions/wishlist";
import type { WishlistItem } from "@/types/database";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { isSeries } from "@/lib/titles";
import { useSeasonsLabel } from "@/components/seasons-picker";
import { cn } from "@/lib/utils";
import { ShareCollectionButton } from "@/components/share-collection-button";

/** share: the "Delen" switch + link; null before public_wishlist.sql. */
export function WishlistClient({ items: initialItems, share }: { items: WishlistItem[]; share?: { isPublic: boolean; url: string } | null }) {
  const { t } = useT();
  const [items, setItems] = useState(initialItems);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const seasonsLabel = useSeasonsLabel();
  const [grailsOnly, setGrailsOnly] = useState(false);
  const grailCount = items.filter((i) => i.is_grail).length;
  const shown = grailsOnly ? items.filter((i) => i.is_grail) : items;

  async function toggleGrail(item: WishlistItem) {
    const next = !item.is_grail;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_grail: next } : i)));
    const result = await setWishlistGrail(item.id, next).catch(() => ({ error: "failed" as const }));
    if (result.error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_grail: !next } : i)));
      toast.error(t(result.error === "not_ready" ? "wishlist_grail_not_ready" : "wishlist_grail_error"));
    }
  }

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
      <PageHeader
        title={t("nav_wishlist")}
        description={
          items.length > 0 ? (
            <>
              {t("wishlist_count", items.length)}
              {grailCount > 0 && <> · {t("wishlist_grail_count", grailCount)}</>}
            </>
          ) : undefined
        }
        actions={
          items.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {share && <ShareCollectionButton kind="wishlist" initialPublic={share.isPublic} shareUrl={share.url} />}
              {[false, true].map((only) => (
                <button
                  key={String(only)}
                  type="button"
                  onClick={() => setGrailsOnly(only)}
                  aria-pressed={grailsOnly === only}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    grailsOnly === only ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {only && <Crown className="size-3.5" aria-hidden />}
                  {t(only ? "wishlist_grail_filter" : "wishlist_grail_all")}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

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
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("wishlist_grail_empty")}</p>
      ) : (
        <PosterGrid>
          {shown.map((item) => (
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
              <PosterCorner position="tl">
                <button
                  type="button"
                  onClick={() => toggleGrail(item)}
                  aria-pressed={!!item.is_grail}
                  aria-label={t(item.is_grail ? "wishlist_grail_unmark" : "wishlist_grail_mark")}
                  title={t(item.is_grail ? "wishlist_grail_unmark" : "wishlist_grail_mark")}
                  className={cn(
                    "rounded-full p-1.5 backdrop-blur-sm transition-opacity focus-visible:opacity-100",
                    item.is_grail
                      ? "bg-primary text-primary-foreground"
                      : "bg-black/70 text-white hover:bg-primary hover:text-primary-foreground md:opacity-0 md:group-hover:opacity-100",
                  )}
                >
                  <Crown className="size-3.5" />
                </button>
              </PosterCorner>
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
