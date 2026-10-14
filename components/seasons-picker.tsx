"use client";

import { useT } from "@/lib/i18n/locale-provider";
import type { SeasonOption } from "@/actions/series";
import { cn } from "@/lib/utils";

/** Season chips for a series release ("Seizoen 1–3", "Complete serie"),
 * plus a one-tap "Complete serie" for every regular season. */
export function SeasonsPicker({
  seasons,
  value,
  onChange,
}: {
  seasons: SeasonOption[];
  value: number[];
  onChange: (next: number[]) => void;
}) {
  const { t } = useT();
  const regular = seasons.filter((s) => s.seasonNumber > 0).map((s) => s.seasonNumber);
  const selected = new Set(value);
  const isComplete = regular.length > 0 && regular.every((n) => selected.has(n));

  function toggle(n: number) {
    const next = new Set(selected);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    onChange(Array.from(next).sort((a, b) => a - b));
  }

  if (seasons.length === 0) return <p className="text-xs text-muted-foreground">…</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={isComplete}
          onClick={() => onChange(isComplete ? value.filter((n) => n === 0) : Array.from(new Set([...value, ...regular])).sort((a, b) => a - b))}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            isComplete ? "border-primary bg-primary text-primary-foreground" : "border-primary/40 text-primary hover:bg-primary/10",
          )}
        >
          {t("series_complete")}
        </button>
        {seasons.map((s) => (
          <button
            key={s.seasonNumber}
            type="button"
            aria-pressed={selected.has(s.seasonNumber)}
            title={s.name}
            onClick={() => toggle(s.seasonNumber)}
            className={cn(
              "min-w-10 rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors",
              selected.has(s.seasonNumber)
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s.seasonNumber === 0 ? t("series_specials") : `S${s.seasonNumber}`}
          </button>
        ))}
      </div>
    </div>
  );
}

/** "S1–3" / "Complete serie" / "Seizoenen onbekend" for a copy or barcode. */
export function useSeasonsLabel() {
  const { t } = useT();
  return (seasons: number[] | null | undefined, total?: number | null) => {
    if (!seasons || seasons.length === 0) return t("series_seasons_unknown");
    const regular = seasons.filter((s) => s > 0);
    if (total && regular.length === total && regular.every((s, i) => s === i + 1)) return t("series_complete");
    return seasonsLabelShort(seasons);
  };
}

function seasonsLabelShort(seasons: number[]) {
  const list = Array.from(new Set(seasons)).sort((a, b) => a - b);
  const regular = list.filter((s) => s > 0);
  const parts: string[] = [];
  for (let i = 0; i < regular.length; i++) {
    let j = i;
    while (j + 1 < regular.length && regular[j + 1] === regular[j] + 1) j++;
    parts.push(i === j ? `S${regular[i]}` : `S${regular[i]}–${regular[j]}`);
    i = j;
  }
  if (list.includes(0)) parts.push("Specials");
  return parts.join(", ");
}
