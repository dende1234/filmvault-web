import { getPublicCollection } from "@/actions/collections";
import { posterUrl } from "@/types/tmdb";
import { coverUrl } from "@/lib/covers";
import { OG_SIZE, collectionOgImage } from "@/lib/brand/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Filmcollectie op Filmory";

/** Link preview of a public collection: its name, owner and count, with a
 * fan of its covers, so every shared link shows what's on the shelf. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const collection = await getPublicCollection((await params).id);
  const covers = (collection?.items ?? [])
    .map((i) => coverUrl(i.custom_cover_path) ?? posterUrl(i.movie_poster, "w342"))
    .filter((u): u is string => !!u)
    .filter((u, i, all) => all.indexOf(u) === i);
  return collectionOgImage({
    name: collection?.name ?? "Filmcollectie",
    owner: collection?.owner_name ?? null,
    count: collection?.items.length ?? 0,
    covers,
  });
}
