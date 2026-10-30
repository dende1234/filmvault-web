import { getWishlist, getWishlistPublic } from "@/actions/wishlist";
import { requireUserId } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";
import { WishlistClient } from "@/components/wishlist-client";

export default async function WishlistPage() {
  const [items, isPublic, userId] = await Promise.all([getWishlist(), getWishlistPublic(), requireUserId()]);
  return (
    <div className="mx-auto max-w-6xl">
      <WishlistClient items={items} share={isPublic === null ? null : { isPublic, url: `${SITE_URL}/v/${userId}` }} />
    </div>
  );
}
