import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getUpgradeTips } from "@/actions/upgrades";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { titleHref } from "@/lib/titles";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Poster } from "@/components/movie/poster";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WishlistToggleButton } from "@/components/wishlist-toggle-button";

export const metadata = { title: "Upgrade-tips" };

/** Titles you own in a lower format while a better release is known. */
export default async function UpgradesPage() {
  const dict = getDictionary(await getLocale());
  const tips = await getUpgradeTips();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        title={dict.upgrades_title}
        description={tips.length > 0 ? format(dict.upgrades_count, tips.length) : dict.upgrades_description}
      />
      {tips.length === 0 ? (
        <EmptyState icon={Sparkles} title={dict.upgrades_empty_title} description={dict.upgrades_empty_description} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{dict.upgrades_description}</p>
          <ul className="flex flex-col gap-2">
            {tips.map((tip) => (
              <li key={tip.tmdbId}>
                <Card>
                  <CardContent className="flex items-center gap-3 pt-5">
                    <Link href={titleHref(tip.tmdbId)} className="shrink-0">
                      <Poster path={tip.poster} title={tip.title} size="xs" className="w-10" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link href={titleHref(tip.tmdbId)} className="truncate font-medium hover:text-primary">
                        {tip.title}
                      </Link>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="outline">{tip.ownedType}</Badge>
                        <ArrowRight className="size-3" aria-hidden />
                        <Badge variant="success">{tip.betterType}</Badge>
                      </p>
                    </div>
                    <WishlistToggleButton tmdbMovieId={tip.tmdbId} movieTitle={tip.title} moviePoster={tip.poster} initialOnWishlist={tip.wished} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
