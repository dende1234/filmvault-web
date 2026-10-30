"use client";

import Link from "next/link";
import { Eye, Package, X } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { Poster, PosterCorner } from "@/components/movie/poster";
import { Badge } from "@/components/ui/badge";
import { PosterControl, WatchedToggle } from "@/components/watched-toggle";

export type BoxCardFilm = {
  key: string;
  title: string;
  poster: string | null;
  customCover?: string | null;
  watched?: boolean;
  /** Link to this copy; omitted on the read-only public page. */
  href?: string;
  /** Owner only: the "Bekeken" switch on the small card. */
  onToggleWatched?: () => void;
};

const VISIBLE = 3;

/** A box set in a poster grid: spans two columns, shows the box name, format
 * and film count, and the films as small cards. With a box page (href), more
 * films than fit end in a "+N" card that opens it; without one, all are shown. */
export function BoxCard({
  name,
  type,
  editie,
  films,
  href,
  onRemove,
  className,
}: {
  name: string;
  type: string;
  editie: string;
  films: BoxCardFilm[];
  /** Box page; omitted on the read-only public page. */
  href?: string;
  onRemove?: () => void;
  className?: string;
}) {
  const { t } = useT();
  // "+N" opens the box page; without one (public page) every film is shown.
  const overflow = !!href && films.length > VISIBLE;
  const shown = overflow ? films.slice(0, VISIBLE - 1) : films;
  const meta = [type, editie && editie !== "Normaal" ? editie : null, t("box_card_film_count", films.length)].filter(Boolean).join(" · ");

  const title = (
    <span className="line-clamp-1 font-display text-base font-semibold leading-tight tracking-tight sm:text-lg">{name}</span>
  );

  return (
    <div
      className={cn(
        "group/box relative col-span-2 flex flex-col gap-3 self-start overflow-hidden rounded-card border border-border/70 bg-card/70 p-3 shadow-md shadow-black/20 sm:p-4",
        "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-gradient-to-r before:from-primary/70 before:via-primary/30 before:to-transparent",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3 pr-7">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/30">
          <Package className="size-4 text-primary" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          {href ? (
            <Link href={href} className="min-w-0 hover:text-primary focus-visible:text-primary focus-visible:outline-none">
              {title}
            </Link>
          ) : (
            title
          )}
          <span className="truncate text-xs text-muted-foreground">{meta}</span>
        </div>
      </div>

      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {shown.map((film) => {
          const card = (
            <>
              <Poster path={film.poster} customCover={film.customCover} title={film.title} size="sm" hover={!!film.href}>
                {!film.onToggleWatched && film.watched && (
                  <PosterCorner position="bl">
                    <Badge variant="overlay" className="px-1.5" title={t("watched_label")}>
                      <Eye className="text-success" />
                    </Badge>
                  </PosterCorner>
                )}
              </Poster>
              <span className="line-clamp-1 text-xs font-medium leading-snug transition-colors group-hover:text-primary">{film.title}</span>
            </>
          );
          return (
            <li key={film.key} className="group relative min-w-0">
              {film.href ? (
                <Link href={film.href} className="flex flex-col gap-1.5 focus-visible:outline-none">
                  {card}
                </Link>
              ) : (
                <div className="flex flex-col gap-1.5">{card}</div>
              )}
              {film.onToggleWatched && (
                <PosterControl>
                  <WatchedToggle size="sm" watched={!!film.watched} onToggle={film.onToggleWatched} />
                </PosterControl>
              )}
            </li>
          );
        })}
        {overflow && (
          <li className="min-w-0">
            {(() => {
              const more = (
                <span className="flex aspect-[2/3] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-elevated/50 text-muted-foreground transition-colors group-hover:border-primary/60 group-hover:text-primary">
                  <span className="font-display text-2xl font-semibold">+{films.length - shown.length}</span>
                  <span className="text-[11px]">{t("box_card_more")}</span>
                </span>
              );
              return href ? (
                <Link href={href} className="group block focus-visible:outline-none" aria-label={t("box_card_open", name)}>
                  {more}
                </Link>
              ) : (
                more
              );
            })()}
          </li>
        )}
      </ul>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2.5 top-2.5 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm transition-opacity hover:bg-destructive focus-visible:opacity-100 md:opacity-0 md:group-hover/box:opacity-100"
          aria-label={t("box_card_remove", name)}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
