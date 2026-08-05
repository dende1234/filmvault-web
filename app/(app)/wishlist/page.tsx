import { getWishlist } from "@/actions/wishlist";
import { WishlistClient } from "@/components/wishlist-client";

export default async function WishlistPage() {
  const items = await getWishlist();
  return (
    <div className="mx-auto max-w-2xl">
      <WishlistClient items={items} />
    </div>
  );
}
