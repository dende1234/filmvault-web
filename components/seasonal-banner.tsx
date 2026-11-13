"use client";

import Link from "next/link";
import { Gift, Sparkles, ShoppingBag, X } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { useLocalFlag } from "@/lib/use-local-flag";
import type { Season } from "@/lib/season";
import { Button } from "@/components/ui/button";

/** Dashboard nudge for the season (lib/season.ts): share your wishlist as a
 * gift list before Sinterklaas/Christmas, or open shop mode around Black
 * Friday, or share your year in film after Christmas. Dismissed per season
 * and year. */
export function SeasonalBanner({ season, year }: { season: Season; year: number }) {
  const { t } = useT();
  const [dismissed, setDismissed] = useLocalFlag(`fv_season_${season}_${year}`);
  if (dismissed) return null;
  const gifts = season === "gifts";
  const Icon = gifts ? Gift : season === "wrapped" ? Sparkles : ShoppingBag;
  const title = gifts ? t("season_gifts_title") : season === "wrapped" ? t("season_wrapped_title", year) : t("season_bf_title");
  const body = gifts ? t("season_gifts_body") : season === "wrapped" ? t("season_wrapped_body") : t("season_bf_body");

  return (
    <div className="relative flex items-start gap-3 rounded-card border border-primary/30 bg-primary/10 p-4">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("season_dismiss")}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-elevated hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-col gap-1.5 pr-6">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {gifts ? (
            <Button asChild size="sm">
              <Link href="/wishlist">{t("season_gifts_cta")}</Link>
            </Button>
          ) : season === "wrapped" ? (
            <Button asChild size="sm">
              <Link href={`/recap?jaar=${year}`}>{t("season_wrapped_cta")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm">
                <Link href="/scannen?modus=winkel">{t("season_bf_cta")}</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={t("season_bf_guide_href")}>{t("season_bf_guide")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
