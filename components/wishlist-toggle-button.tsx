"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { addToWishlist, removeFromWishlistByMovie } from "@/actions/wishlist";
import { Button } from "@/components/ui/button";

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

  async function toggle() {
    setIsToggling(true);
    try {
      if (onWishlist) {
        await removeFromWishlistByMovie(tmdbMovieId);
      } else {
        await addToWishlist(tmdbMovieId, movieTitle, moviePoster);
      }
      setOnWishlist(!onWishlist);
    } catch {
      toast.error(t("wishlist_error_toggle"));
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <Button variant="outline" onClick={toggle} disabled={isToggling} className="w-fit">
      {t(onWishlist ? "wishlist_remove_button" : "wishlist_add_button")}
    </Button>
  );
}
