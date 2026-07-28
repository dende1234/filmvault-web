import { Award, Lock } from "lucide-react";
import { checkAndAwardBadges, getEarnedBadges } from "@/actions/badges";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { BADGE_IDS } from "@/types/database";
import { Card } from "@/components/ui/card";

export default async function BadgesPage() {
  const dict = getDictionary(await getLocale());
  await checkAndAwardBadges();
  const earned = await getEarnedBadges();
  const earnedByBadgeId = new Map(earned.map((b) => [b.badge_id, b]));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <h1 className="mb-3 text-2xl font-semibold">{dict.nav_badges}</h1>
      {BADGE_IDS.map((badge) => {
        const row = earnedByBadgeId.get(badge.id);
        const isEarned = !!row;
        return (
          <Card key={badge.id} className="flex items-center gap-4 p-4">
            {isEarned ? (
              <Award className="h-9 w-9 flex-none text-primary" />
            ) : (
              <Lock className="h-9 w-9 flex-none text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">{dict[badge.titleKey]}</p>
              <p className="text-sm text-muted-foreground">{dict[badge.descKey]}</p>
              {isEarned && row.earned_at && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {format(dict.badges_earned_at, row.earned_at.slice(0, 10))}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
