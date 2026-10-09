import { Award, Lock } from "lucide-react";
import { checkAndAwardBadges, getEarnedBadges } from "@/actions/badges";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { BADGE_IDS } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const metadata = { title: "Badges" };

export default async function BadgesPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  await checkAndAwardBadges();
  const earned = await getEarnedBadges();
  const earnedByBadgeId = new Map(earned.map((b) => [b.badge_id, b]));
  const earnedCount = BADGE_IDS.filter((b) => earnedByBadgeId.has(b.id)).length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader title={dict.nav_badges} description={format(dict.badges_progress, earnedCount, BADGE_IDS.length)} />
      <Progress value={earnedCount} max={BADGE_IDS.length} className="max-w-md" label={format(dict.badges_progress, earnedCount, BADGE_IDS.length)} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {BADGE_IDS.map((badge) => {
          const row = earnedByBadgeId.get(badge.id);
          const isEarned = !!row;
          return (
            <div
              key={badge.id}
              className={cn(
                "flex flex-col items-center gap-3 rounded-card border p-5 text-center transition-colors",
                isEarned ? "border-primary/30 bg-gradient-to-b from-primary/10 to-card" : "border-border/70 bg-card",
              )}
            >
              {/* Medallion: amber glow when earned, dimmed and locked when not. */}
              <div
                className={cn(
                  "flex size-16 items-center justify-center rounded-full ring-1",
                  isEarned
                    ? "bg-primary/15 shadow-[0_0_32px_-6px_var(--primary)] ring-primary/50"
                    : "bg-elevated ring-border",
                )}
              >
                {isEarned ? (
                  <Award className="size-8 text-primary" aria-hidden />
                ) : (
                  <Lock className="size-6 text-muted-foreground/60" aria-hidden />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <p className={cn("font-display font-semibold leading-tight tracking-tight", !isEarned && "text-muted-foreground")}>
                  {dict[badge.titleKey]}
                </p>
                <p className="text-xs text-muted-foreground">{dict[badge.descKey]}</p>
                {isEarned && row.earned_at && (
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-primary">
                    {format(dict.badges_earned_at, new Date(row.earned_at).toLocaleDateString(locale))}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
