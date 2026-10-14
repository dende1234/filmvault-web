/** Season helpers for series copies ("Seizoen 1–3", "Complete serie"). */

/** Sorted, de-duplicated, non-negative season numbers (0 = specials). */
export function normalizeSeasons(seasons: number[] | null | undefined): number[] {
  return Array.from(new Set((seasons ?? []).filter((s) => Number.isInteger(s) && s >= 0))).sort((a, b) => a - b);
}

/** [1,2,3,5] → [[1,3],[5,5]] */
function ranges(seasons: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const s of seasons) {
    const last = out[out.length - 1];
    if (last && s === last[1] + 1) last[1] = s;
    else out.push([s, s]);
  }
  return out;
}

/** Short label for badges: "S1–3", "S1–2, S5", "Specials". `complete` when
 * every regular season of the series (1..total) is included. */
export function seasonsShort(seasons: number[] | null | undefined, total?: number | null): { label: string; complete: boolean } | null {
  const list = normalizeSeasons(seasons);
  if (list.length === 0) return null;
  const regular = list.filter((s) => s > 0);
  const complete = !!total && total > 0 && regular.length === total && regular[0] === 1 && regular[regular.length - 1] === total;
  const parts = ranges(regular).map(([a, b]) => (a === b ? `S${a}` : `S${a}–${b}`));
  if (list.includes(0)) parts.push("Specials");
  return { label: parts.join(", "), complete };
}

/** Free text from a spreadsheet → season numbers. "1-3", "1,2,4", "S1",
 * "seizoen 2", "Season 1-2 + 4", "complete" (needs `total`). */
export function parseSeasons(text: string, total?: number | null): number[] | null {
  const v = text.trim().toLowerCase();
  if (!v) return null;
  if (/compleet|complete|volledig|\balle\b|\ball\b|integraal/.test(v) && total) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const out: number[] = [];
  for (const m of v.matchAll(/(\d+)\s*(?:[-–—]|t\/m|tot|to|until)\s*(?:s(?:eason|eizoen)?\s*)?(\d+)|(\d+)/g)) {
    if (m[1] && m[2]) {
      const [a, b] = [Number(m[1]), Number(m[2])];
      if (b >= a && b - a < 100) for (let s = a; s <= b; s++) out.push(s);
    } else if (m[3]) out.push(Number(m[3]));
  }
  if (/special/.test(v)) out.push(0);
  const list = normalizeSeasons(out);
  return list.length ? list : null;
}
