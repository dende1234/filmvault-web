"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/locale-provider";
import { titleHref } from "@/lib/titles";
import type { Comparison } from "@/lib/compare";
import { Poster } from "@/components/movie/poster";
import { PosterGrid } from "@/components/movie/poster-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const PAGE = 48;
type Key = keyof Comparison;

/** "Vergelijken" on a friend's page: what only they have, what only you
 * have, what you both have, and your wishlist titles they own. */
export function FriendCompare({ comparison, friendName }: { comparison: Comparison; friendName: string }) {
  const { t } = useT();
  const [shown, setShown] = useState<Record<Key, number>>({ wishTheyHave: PAGE, onlyThem: PAGE, onlyMe: PAGE, both: PAGE });
  const tabs: { key: Key; label: string }[] = [
    { key: "wishTheyHave", label: t("compare_wish_they_have", comparison.wishTheyHave.length) },
    { key: "onlyThem", label: t("compare_only_them", friendName, comparison.onlyThem.length) },
    { key: "onlyMe", label: t("compare_only_me", comparison.onlyMe.length) },
    { key: "both", label: t("compare_both", comparison.both.length) },
  ];
  const first = tabs.find((tab) => comparison[tab.key].length > 0)?.key ?? "onlyThem";

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold tracking-tight">{t("compare_title")}</h2>
      <Tabs defaultValue={first}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="whitespace-nowrap">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {tabs.map(({ key }) => {
          const list = comparison[key];
          return (
            <TabsContent key={key} value={key} className="mt-4">
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("compare_none")}</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <PosterGrid dense>
                    {list.slice(0, shown[key]).map((title) => (
                      <Link key={title.tmdbId} href={titleHref(title.tmdbId)} className="group flex flex-col gap-2">
                        <Poster path={title.poster} title={title.title} size="sm" hover />
                        <p className="line-clamp-2 text-xs font-medium leading-snug group-hover:text-primary">{title.title}</p>
                      </Link>
                    ))}
                  </PosterGrid>
                  {list.length > shown[key] && (
                    <Button variant="secondary" className="w-fit" onClick={() => setShown((s) => ({ ...s, [key]: s[key] + PAGE }))}>
                      {t("compare_more", list.length - shown[key])}
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}
