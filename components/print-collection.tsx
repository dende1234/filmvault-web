import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { OwnCopy } from "@/lib/collection-copies";
import { format, type Dictionary } from "@/lib/i18n/dictionary";
import { posterUrl } from "@/types/tmdb";
import { coverUrl } from "@/lib/covers";
import { isSeries } from "@/lib/titles";
import { PrintButton } from "@/components/print-button";
import { formatPrice, totalValue } from "@/lib/purchase";

/** One line on the list: a single copy, or a box with its films. */
type Line = { key: string; head: OwnCopy; films: OwnCopy[] };

function toLines(copies: OwnCopy[]): Line[] {
  const lines: Line[] = [];
  const boxes = new Map<string, Line>();
  for (const copy of copies) {
    const box = copy.item.is_box ? copy.item.box_group_id : null;
    if (box) {
      const line = boxes.get(box);
      if (line) line.films.push(copy);
      else {
        const created = { key: box, head: copy, films: [copy] };
        boxes.set(box, created);
        lines.push(created);
      }
    } else lines.push({ key: copy.item.item_group_id, head: copy, films: [] });
  }
  const title = (l: Line) => (l.films.length ? (l.head.item.box_name ?? l.head.item.movie_title) : l.head.item.movie_title);
  return lines.sort((a, b) => title(a).localeCompare(title(b), "nl"));
}

/** The printable collection overview (server-rendered; the button prints). */
export function PrintCollection({
  copies,
  names,
  collection,
  ownerName,
  dict,
  locale,
}: {
  copies: OwnCopy[];
  names: Map<string, string>;
  collection: string | null;
  ownerName: string | null;
  dict: Dictionary;
  locale: string;
}) {
  const lines = toLines(copies);
  const byFormat = new Map<string, number>();
  for (const l of lines) byFormat.set(l.head.item.type || "–", (byFormat.get(l.head.item.type || "–") ?? 0) + 1);
  const boxCount = lines.filter((l) => l.films.length > 0).length;
  const titleCount = copies.length;
  const scope = collection ? (names.get(collection) ?? "") : dict.print_all_collections;
  const showCollection = !collection && names.size > 1;
  const today = new Date().toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const value = totalValue(copies.map((c) => c.item));
  const lineValue = (l: Line) => totalValue((l.films.length ? l.films : [l.head]).map((c) => c.item));
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL") : "");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 print:max-w-none print:gap-4 print:text-black">
      {/* Landscape A4: the table has many columns. */}
      <style>{`@page { size: A4 landscape; margin: 12mm; } @media print { body { background: #fff !important; } }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={collection ? `/collections/${collection}` : "/collections"} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {dict.print_back}
        </Link>
        <PrintButton />
      </div>
      <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground print:hidden">{dict.print_hint}</p>

      <header className="flex flex-col gap-1 border-b border-border pb-4 print:border-black/30">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{dict.print_title}</h1>
        <p className="text-sm text-muted-foreground print:text-black/70">
          {[scope, ownerName, format(dict.print_date, today)].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm">
          {format(dict.print_summary, titleCount, lines.length)}
          {boxCount > 0 && <> · {format(boxCount === 1 ? dict.print_summary_box : dict.print_summary_boxes, boxCount)}</>}
          {" · "}
          {Array.from(byFormat.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([f, n]) => `${n}× ${f}`)
            .join(", ")}
        </p>
        {value.priced > 0 && (
          <p className="text-sm font-medium">
            {format(dict.print_total_value, formatPrice(value.total, locale))}
            {value.priced < lines.length && (
              <span className="font-normal text-muted-foreground print:text-black/70"> · {format(dict.print_total_value_partial, value.priced)}</span>
            )}
          </p>
        )}
      </header>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">{dict.print_empty}</p>
      ) : (
        <table className="w-full border-collapse text-sm print:text-[9pt]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground print:border-black/40 print:text-black/70">
              <th className="w-10 py-2 pr-2" aria-label={dict.print_col_cover} />
              <th className="py-2 pr-3 font-medium">{dict.print_col_title}</th>
              <th className="py-2 pr-3 font-medium">{dict.print_col_format}</th>
              <th className="py-2 pr-3 font-medium">{dict.print_col_edition}</th>
              <th className="py-2 pr-3 font-medium">{dict.print_col_region}</th>
              <th className="py-2 pr-3 font-medium">{dict.print_col_barcode}</th>
              <th className="py-2 pr-3 font-medium">{dict.print_col_condition}</th>
              {showCollection && <th className="py-2 pr-3 font-medium">{dict.print_col_collection}</th>}
              {value.priced > 0 && <th className="py-2 pr-3 text-right font-medium">{dict.print_col_price}</th>}
              <th className="py-2 font-medium">{dict.print_col_added}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(({ key, head, films }) => {
              const it = head.item;
              const src = coverUrl(it.custom_cover_path) ?? posterUrl(it.movie_poster, "w200");
              const edition = [it.editie !== "Normaal" ? it.editie : null, it.cut, it.label].filter(Boolean).join(" · ");
              return (
                <tr key={key} className="break-inside-avoid border-b border-border/60 align-top print:border-black/15">
                  <td className="py-1.5 pr-2">
                    {src ? (
                      <Image src={src} alt="" width={28} height={42} className="h-[42px] w-7 rounded-sm object-cover" />
                    ) : (
                      <div className="h-[42px] w-7 rounded-sm bg-muted" />
                    )}
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className="font-medium">{films.length ? (it.box_name ?? it.movie_title) : it.movie_title}</span>
                    {!films.length && isSeries(it.tmdb_movie_id) && (
                      <span className="text-muted-foreground print:text-black/60">
                        {" "}
                        ({it.seasons?.length ? format(it.seasons.length === 1 ? dict.print_series_season : dict.print_series_seasons, it.seasons.join(", ")) : dict.print_series})
                      </span>
                    )}
                    {films.length > 0 && (
                      <span className="block text-xs text-muted-foreground print:text-black/60">
                        {format(dict.print_box_films, films.length)}: {films.map((f) => f.item.movie_title).join(", ")}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{it.type}</td>
                  <td className="py-1.5 pr-3">{edition}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{it.region ?? ""}</td>
                  <td className="py-1.5 pr-3 font-mono text-xs whitespace-nowrap">{it.barcode ?? ""}</td>
                  <td className="py-1.5 pr-3">{it.condition ?? ""}</td>
                  {showCollection && <td className="py-1.5 pr-3">{head.collections.join(", ")}</td>}
                  {value.priced > 0 && (
                    <td className="py-1.5 pr-3 text-right whitespace-nowrap tabular-nums">
                      {lineValue({ key, head, films }).priced > 0 ? formatPrice(lineValue({ key, head, films }).total, locale) : ""}
                    </td>
                  )}
                  <td className="py-1.5 whitespace-nowrap">{date(it.added_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="text-xs text-muted-foreground print:text-black/60">{format(dict.print_footer, today)}</p>
    </div>
  );
}
