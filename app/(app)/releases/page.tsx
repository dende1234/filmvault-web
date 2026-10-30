import Link from "next/link";
import { Bookmark, CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { getReleaseMonth, getUpcomingWishlistReleases, type CalendarRelease } from "@/actions/releases";
import { getDictionary, format, type Dictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { titleHref } from "@/lib/titles";
import { watchCountry } from "@/lib/watch-country";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Poster } from "@/components/movie/poster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Releasekalender" };
export const maxDuration = 60;

function shift(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

function ReleaseList({ items, dict, locale }: { items: CalendarRelease[]; dict: Dictionary; locale: string }) {
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <ul className="flex flex-col gap-2">
      {items.map((r) => (
        <li key={`${r.tmdbId}-${r.date}`}>
          <Link href={titleHref(r.tmdbId)} className="flex items-center gap-3 rounded-card border border-border/70 bg-card p-3 hover:border-primary/50">
            <Poster path={r.poster} title={r.title} size="xs" className="w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">
                {date.format(new Date(`${r.date}T00:00:00Z`))}
                {r.note && <> · {r.note}</>}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {r.wished && (
                <Badge variant="default" className="gap-1">
                  <Bookmark className="size-3" aria-hidden />
                  {dict.releases_on_wishlist}
                </Badge>
              )}
              {r.owned && (
                <Badge variant="outline" className="gap-1">
                  <Check className="size-3" aria-hidden />
                  {dict.releases_owned}
                </Badge>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** DVD, Blu-ray and 4K releases per month in the Netherlands (or Belgium),
 * from TMDB; your wishlist titles first, plus what's still coming from it. */
export default async function ReleasesPage({ searchParams }: { searchParams: Promise<{ maand?: string }> }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const { maand } = await searchParams;
  const current = new Date().toISOString().slice(0, 7);
  const month = maand && /^\d{4}-(0[1-9]|1[0-2])$/.test(maand) ? maand : current;
  const country = await watchCountry();
  const [releases, upcoming] = await Promise.all([getReleaseMonth(month, country), month === current ? getUpcomingWishlistReleases(country) : Promise.resolve([])]);
  const monthName = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={dict.releases_title} description={format(dict.releases_subtitle, country === "BE" ? dict.releases_country_be : dict.releases_country_nl)} />

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">{dict.releases_from_wishlist}</h2>
          <ReleaseList items={upcoming} dict={dict} locale={locale} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="icon" aria-label={dict.action_previous}>
            <Link href={`/releases?maand=${shift(month, -1)}`}>
              <ChevronLeft />
            </Link>
          </Button>
          <h2 className="font-display text-xl font-semibold capitalize tracking-tight">{monthName}</h2>
          <Button asChild variant="ghost" size="icon" aria-label={dict.action_next}>
            <Link href={`/releases?maand=${shift(month, 1)}`}>
              <ChevronRight />
            </Link>
          </Button>
        </div>
        {releases.length === 0 ? (
          <EmptyState icon={CalendarDays} title={dict.releases_empty} />
        ) : (
          <ReleaseList items={releases} dict={dict} locale={locale} />
        )}
      </section>
      <p className="text-xs text-muted-foreground">{dict.releases_source}</p>
    </div>
  );
}
