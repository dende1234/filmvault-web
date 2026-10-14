import Link from "next/link";
import type { Collection } from "@/types/database";
import { Poster } from "@/components/movie/poster";

export type CollectionPreview = { count: number; posters: { path: string | null; title: string; customCover?: string | null }[] };

/** Collection tile: four-poster collage fading into the card, name, film
 * count and description. Used for your own and friends' collections. */
export function CollectionCard({
  collection,
  preview,
  href,
  countLabel,
}: {
  collection: Collection;
  preview: CollectionPreview;
  href: string;
  countLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-card border border-border/70 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative grid aspect-[16/9] grid-cols-4 gap-1 overflow-hidden bg-elevated p-1">
        {Array.from({ length: 4 }, (_, i) => {
          const poster = preview.posters[i];
          return poster ? (
            <Poster key={i} path={poster.path} customCover={poster.customCover} title={poster.title} size="xs" className="rounded-md shadow-none ring-0" />
          ) : (
            <div key={i} className="rounded-md bg-muted/60" />
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 pb-4">
        <p className="font-display text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">{collection.name}</p>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{countLabel}</p>
        {collection.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{collection.description}</p>}
      </div>
    </Link>
  );
}

/** Builds per-collection previews (count + four newest posters). */
export function buildCollectionPreviews(
  items: { collection_id: string; added_at: string | null; movie_poster: string | null; movie_title: string; custom_cover_path?: string | null }[],
): Record<string, CollectionPreview> {
  const previews: Record<string, CollectionPreview> = {};
  const newestFirst = [...items].sort((a, b) => (b.added_at ?? "").localeCompare(a.added_at ?? ""));
  for (const item of newestFirst) {
    const preview = (previews[item.collection_id] ??= { count: 0, posters: [] });
    preview.count++;
    if (preview.posters.length < 4) preview.posters.push({ path: item.movie_poster, title: item.movie_title, customCover: item.custom_cover_path });
  }
  return previews;
}
