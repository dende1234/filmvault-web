"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown } from "lucide-react";
import type { PublicWishlist } from "@/actions/wishlist";
import { setPublicWishlistReservation } from "@/actions/public-wishlist";
import { useT } from "@/lib/i18n/locale-provider";
import { isSeries } from "@/lib/titles";
import { seasonsShort } from "@/lib/seasons";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function PublicWishlistItems({ userId, items, reservationsReady }: {
  userId: string; items: PublicWishlist["items"]; reservationsReady: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Other recipients may choose a gift while this tab is open. Refresh on
  // return and periodically while visible; the atomic write also checks races.
  useEffect(() => {
    if (!reservationsReady) return;
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reservationsReady, router]);

  function toggle(titleId: number, reserved: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setPublicWishlistReservation(userId, titleId, reserved);
        if (result.error) {
          setError(t(result.error === "taken" ? "wishlist_reservation_taken"
            : result.error === "not_ready" ? "wishlist_reservation_not_ready"
            : result.error === "not_allowed" ? "wishlist_reservation_not_allowed"
            : result.error === "unavailable" ? "wishlist_reservation_unavailable" : "wishlist_reservation_error"));
        }
        router.refresh();
      } catch {
        setError(t("wishlist_reservation_error"));
      }
    });
  }

  return (
    <section className="flex flex-col gap-5" aria-label={t("nav_wishlist")}>
      <p className="max-w-prose text-sm text-muted-foreground">
        {t(reservationsReady ? "wishlist_reservation_hint" : "wishlist_reservation_not_ready")}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {items.length === 0 ? <p className="text-muted-foreground">{t("public_wishlist_empty")}</p> : (
        <PosterGrid>
          {items.map((item, i) => (
            <div key={item.tmdb_movie_id} className="flex flex-col gap-2" aria-busy={isPending}>
              <Poster path={item.movie_poster} title={item.movie_title} priority={i < 6}>
                {item.is_grail && <PosterCorner position="tr"><Badge variant="overlay" className="gap-1"><Crown className="size-3 text-primary" aria-hidden />{t("public_wishlist_grail")}</Badge></PosterCorner>}
                {isSeries(item.tmdb_movie_id) && seasonsShort(item.seasons) && (
                  <PosterCorner position="bl"><Badge variant="overlay">{seasonsShort(item.seasons)!.label}</Badge></PosterCorner>
                )}
              </Poster>
              <p className={cn("line-clamp-2 text-sm font-medium leading-snug", item.is_reserved && "text-muted-foreground line-through")}>{item.movie_title}</p>
              {reservationsReady && (
                <label className="flex min-h-11 items-start gap-2 rounded-lg border border-border p-2 text-sm">
                  <Checkbox className="mt-0.5" checked={!!item.is_reserved}
                    disabled={isPending || (!!item.is_reserved && !item.can_release)}
                    aria-label={t(item.is_reserved ? item.can_release ? "wishlist_reservation_uncheck" : "wishlist_reservation_marked" : "wishlist_reservation_check", item.movie_title)}
                    onCheckedChange={(checked) => toggle(item.tmdb_movie_id, checked === true)} />
                  <span>{t(item.is_reserved
                    ? item.reserved_by_you ? "wishlist_reservation_yours" : "wishlist_reservation_reserved"
                    : "wishlist_reservation_available")}</span>
                </label>
              )}
            </div>
          ))}
        </PosterGrid>
      )}
    </section>
  );
}
