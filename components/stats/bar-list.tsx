import type { Count } from "@/lib/collection-stats";

/** Horizontal bars with the label and number as text (the bar only adds
 * the proportion), so it reads without colour and works as a table. */
export function BarList({ items, total, emptyText }: { items: Count[]; total: number; emptyText: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => (
        <li key={i.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate" title={i.key}>
            {i.key}
          </span>
          <span className="h-2 rounded-full bg-muted" aria-hidden>
            <span className="block h-2 rounded-full bg-primary" style={{ width: `${Math.max(2, (i.count / max) * 100)}%` }} />
          </span>
          <span className="tabular-nums text-muted-foreground">
            {i.count}
            {total > 0 && <span className="ml-1 text-xs">({Math.round((i.count / total) * 100)}%)</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Copies added per month: thin columns, the number above the latest and
 * the highest month, the exact number on hover/focus. */
export function MonthColumns({ months, locale }: { months: Count[]; locale: string }) {
  const max = Math.max(1, ...months.map((m) => m.count));
  const peak = months.reduce((p, m, i) => (m.count > months[p].count ? i : p), 0);
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { month: "short", year: "2-digit", timeZone: "UTC" });
  const label = (key: string) => fmt.format(new Date(`${key}-01T00:00:00Z`));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-36 items-end gap-[2px] border-b border-border pt-5" role="list">
        {months.map((m, i) => {
          const pct = (m.count / max) * 100;
          return (
            <div
              key={m.key}
              role="listitem"
              tabIndex={0}
              aria-label={`${label(m.key)}: ${m.count}`}
              className="group relative flex h-full flex-1 flex-col items-center justify-end focus:outline-none"
            >
              {(i === peak || i === months.length - 1) && m.count > 0 && (
                <span className="mb-0.5 text-[10px] tabular-nums text-muted-foreground">{m.count}</span>
              )}
              <span
                className="w-full max-w-6 rounded-t-[4px] bg-primary/80 transition-colors group-hover:bg-primary group-focus-visible:bg-primary"
                style={{ height: m.count ? `${Math.max(3, pct)}%` : "0" }}
              />
              <span className="pointer-events-none absolute -top-6 z-10 hidden whitespace-nowrap rounded-md border border-border bg-card px-2 py-0.5 text-xs text-foreground shadow group-hover:block group-focus-visible:block">
                {label(m.key)}: {m.count}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label(months[0].key)}</span>
        <span>{label(months[months.length - 1].key)}</span>
      </div>
    </div>
  );
}
