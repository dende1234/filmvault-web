import { ShopMode } from "@/components/shop-mode";

export const metadata = { title: "Winkelmodus" };

/** Scan or search in a shop: do I own it, another edition, or is it on my wishlist? */
export default function ShopModePage() {
  return (
    <div className="mx-auto max-w-xl">
      <ShopMode />
    </div>
  );
}
