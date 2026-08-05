"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useT } from "@/lib/i18n/locale-provider";
import { removeFromWishlist } from "@/actions/wishlist";
import type { WishlistItem } from "@/types/database";
import { posterUrl } from "@/types/tmdb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WishlistClient({ items: initialItems }: { items: WishlistItem[] }) {
  const { t } = useT();
  const [items, setItems] = useState(initialItems);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

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
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("nav_wishlist")}</h1>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("wishlist_empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const poster = posterUrl(item.movie_poster, "w200");
            return (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-3 pt-5">
                  <Link href={`/films/${item.tmdb_movie_id}`} className="flex flex-1 items-center gap-3 min-w-0">
                    <div className="relative h-16 w-11 flex-none overflow-hidden rounded-md bg-muted">
                      {poster && <Image src={poster} alt="" fill className="object-cover" />}
                    </div>
                    <p className="truncate font-medium">{item.movie_title}</p>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={removingIds.has(item.id)}
                    onClick={() => remove(item)}
                  >
                    {t("action_delete")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
