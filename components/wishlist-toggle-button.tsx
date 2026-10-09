"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
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
    <Button variant="secondary" onClick={toggle} disabled={isToggling} aria-pressed={onWishlist} className="w-fit">
      {onWishlist ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
      {t(onWishlist ? "wishlist_remove_button" : "wishlist_add_button")}
    </Button>
  );
}
