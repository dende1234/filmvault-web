"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { addToWishlist, removeFromWishlistByMovie } from "@/actions/wishlist";
import { getSeriesSeasons, type SeasonOption } from "@/actions/series";
import { isSeries } from "@/lib/titles";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SeasonsPicker } from "@/components/seasons-picker";

export function WishlistToggleButton({
  tmdbMovieId,
  movieTitle,
  moviePoster,
  initialOnWishlist,
}: {
  tmdbMovieId: number;
  movieTitle: string;
  moviePoster: string | null;
  initialOnWishlist: boolean;
}) {
  const { t } = useT();
  const [onWishlist, setOnWishlist] = useState(initialOnWishlist);
  const [isToggling, setIsToggling] = useState(false);
  // Series: choose the wanted seasons first (none chosen = the whole series).
  const [pickOpen, setPickOpen] = useState(false);
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([]);
  const [seasons, setSeasons] = useState<number[]>([]);

  async function add(wanted: number[] | null) {
    setIsToggling(true);
    try {
      await addToWishlist(tmdbMovieId, movieTitle, moviePoster, wanted);
      setOnWishlist(true);
      setPickOpen(false);
    } catch {
      toast.error(t("wishlist_error_toggle"));
    } finally {
      setIsToggling(false);
    }
  }

  async function toggle() {
    if (!onWishlist && isSeries(tmdbMovieId)) {
      setPickOpen(true);
      if (seasonOptions.length === 0) getSeriesSeasons(tmdbMovieId).then(setSeasonOptions).catch(() => {});
      return;
    }
    if (!onWishlist) return add(null);
    setIsToggling(true);
    try {
      await removeFromWishlistByMovie(tmdbMovieId);
      setOnWishlist(false);
    } catch {
      toast.error(t("wishlist_error_toggle"));
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={toggle} disabled={isToggling} aria-pressed={onWishlist} className="w-fit">
        {onWishlist ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
        {t(onWishlist ? "wishlist_remove_button" : "wishlist_add_button")}
      </Button>
      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("wishlist_add_button")}</DialogTitle>
            <DialogDescription>{t("series_wishlist_seasons_hint")}</DialogDescription>
          </DialogHeader>
          <SeasonsPicker seasons={seasonOptions} value={seasons} onChange={setSeasons} />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPickOpen(false)}>
              {t("action_cancel")}
            </Button>
            <Button onClick={() => add(seasons.length > 0 ? seasons : null)} disabled={isToggling}>
              {seasons.length > 0 ? t("series_wishlist_add_seasons", seasons.length) : t("series_wishlist_add_whole")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
