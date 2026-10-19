"use client";

import { useState } from "react";
import { ScanBarcode } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import type { LeaderboardRow } from "@/actions/badges";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";

/** "Top barcode-bijdragers": approved barcode submissions this month / all
 * time, with your own place (or count) highlighted. */
export function ContributorLeaderboard({
  month,
  allTime,
  mine,
  currentUserId,
}: {
  month: LeaderboardRow[];
  allTime: LeaderboardRow[];
  mine: { month: number; allTime: number };
  currentUserId: string | null;
}) {
  const { t } = useT();
  const [tab, setTab] = useState<"month" | "allTime">("month");
  const rows = tab === "month" ? month : allTime;
  const myCount = tab === "month" ? mine.month : mine.allTime;
  const inList = rows.some((r) => r.userId === currentUserId);

  return (
    <section className="flex flex-col gap-4 rounded-card border border-border/70 bg-card/70 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/30">
            <ScanBarcode className="size-5 text-primary" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-xl font-semibold tracking-tight">{t("leaderboard_title")}</h2>
            <p className="max-w-prose text-sm text-muted-foreground">{t("leaderboard_intro")}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5" role="tablist">
          {(["month", "allTime"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                tab === k ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t(k === "month" ? "leaderboard_month" : "leaderboard_all_time")}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("leaderboard_empty")}</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {rows.map((r, i) => {
            const me = r.userId === currentUserId;
            return (
              <li
                key={r.userId}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2", me ? "bg-primary/10 ring-1 ring-primary/30" : i < 3 && "bg-elevated/40")}
              >
                <span className={cn("w-6 text-center font-display text-sm font-semibold tabular-nums", i < 3 ? "text-primary" : "text-muted-foreground")}>
                  {i + 1}
                </span>
                <Avatar src={r.avatarUrl} name={r.name} className="size-7 text-[10px]" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {r.name}
                  {me && <span className="ml-1.5 text-xs text-primary">({t("leaderboard_you")})</span>}
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">{t("leaderboard_count", r.count)}</span>
              </li>
            );
          })}
        </ol>
      )}

      {!inList && (
        <p className="text-sm text-muted-foreground">
          {myCount > 0 ? t("leaderboard_mine", myCount) : t("leaderboard_mine_none")}
        </p>
      )}
    </section>
  );
}
