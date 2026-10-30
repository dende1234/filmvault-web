import { getPublicWishlist } from "@/actions/wishlist";
import { posterUrl } from "@/types/tmdb";
import { OG_SIZE, collectionOgImage } from "@/lib/brand/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Verlanglijst op Filmory";

/** Link preview of a shared wishlist: whose it is, how many, and a fan of
 * its posters (Holy Grails first, as on the page). */
export default async function Image({ params }: { params: Promise<{ userId: string }> }) {
  const wishlist = await getPublicWishlist((await params).userId);
  const covers = (wishlist?.items ?? [])
    .map((i) => posterUrl(i.movie_poster, "w342"))
    .filter((u): u is string => !!u)
    .filter((u, i, all) => all.indexOf(u) === i);
  return collectionOgImage({
    name: "Verlanglijst",
    owner: wishlist?.owner_name ?? null,
    count: wishlist?.items.length ?? 0,
    covers,
  });
}
