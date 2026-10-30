import Image from "next/image";
import { format, type Dictionary } from "@/lib/i18n/dictionary";
import type { WatchProviderDto, WatchProvidersDto } from "@/types/tmdb";

const COUNTRY_NAME: Record<string, Record<"nl" | "en", string>> = {
  NL: { nl: "Nederland", en: "the Netherlands" },
  BE: { nl: "België", en: "Belgium" },
};

/** "Te zien bij": streaming services for this title in the visitor's
 * country (NL, or BE for Belgian visitors). TMDB's data comes from JustWatch,
 * which must be credited. Renders nothing when there is nothing to show. */
export function WatchProviders({
  providers,
  country,
  dict,
  locale,
}: {
  providers: WatchProvidersDto | undefined;
  country: "NL" | "BE";
  dict: Dictionary;
  locale: "nl" | "en";
}) {
  const here = providers?.results?.[country];
  if (!here) return null;
  const groups: [string, WatchProviderDto[] | undefined][] = [
    [dict.watch_flatrate, [...(here.flatrate ?? []), ...(here.free ?? []), ...(here.ads ?? [])]],
    [dict.watch_rent, here.rent],
    [dict.watch_buy, here.buy],
  ];
  const shown = groups.filter(([, list]) => list && list.length > 0);
  if (shown.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-semibold tracking-tight">{format(dict.watch_title, COUNTRY_NAME[country][locale])}</h2>
      <div className="flex flex-col gap-3">
        {shown.map(([label, list]) => {
          const unique = Array.from(new Map(list!.map((p) => [p.provider_id, p])).values()).sort(
            (a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99),
          );
          return (
            <div key={label} className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
              {unique.map((p) => (
                <a
                  key={p.provider_id}
                  href={here.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={p.provider_name}
                  className="overflow-hidden rounded-lg ring-1 ring-border transition hover:ring-primary"
                >
                  {p.logo_path ? (
                    <Image src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} width={36} height={36} className="size-9" />
                  ) : (
                    <span className="flex h-9 items-center px-2 text-xs">{p.provider_name}</span>
                  )}
                </a>
              ))}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{dict.watch_attribution}</p>
    </section>
  );
}
