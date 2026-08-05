import Link from "next/link";
import Image from "next/image";
import { getUserCollections, getCollectionItemsForCollections } from "@/actions/collections";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddFilmFlow } from "@/components/add-film-flow";
import { AddBoxFlow } from "@/components/add-box-flow";
import { SurpriseMeButton } from "@/components/surprise-me-button";
import { posterUrl } from "@/types/tmdb";

export default async function DashboardPage() {
  const dict = getDictionary(await getLocale());
  const collections = await getUserCollections();
  const rawItems = await getCollectionItemsForCollections(collections.map((c) => c.id));

  // Same physical film can span multiple collections (shared item_group_id) —
  // dedupe so it's counted/shown once, mirrors DashboardViewModel.kt exactly.
  const seen = new Set<string>();
  const items = rawItems.filter((item) => {
    if (seen.has(item.item_group_id)) return false;
    seen.add(item.item_group_id);
    return true;
  });

  const watchedCount = items.filter((i) => i.watched).length;
  const recentItems = [...items]
    .sort((a, b) => (b.added_at ?? "").localeCompare(a.added_at ?? ""))
    .slice(0, 5);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{dict.dashboard_title}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={dict.collections_label} value={collections.length} />
        <StatCard label={dict.films_label} value={items.length} />
        <StatCard label={dict.watched_label} value={watchedCount} />
        <StatCard label={dict.not_watched_label} value={items.length - watchedCount} />
      </div>

      <div className="flex flex-wrap gap-3">
        <AddFilmFlow />
        <AddBoxFlow />
        <SurpriseMeButton unwatchedItems={items.filter((i) => !i.watched)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.dashboard_recent_title}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.dashboard_empty_recent}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/collections/${item.collection_id}/items/${item.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                  >
                    <div className="relative h-16 w-11 overflow-hidden rounded-md bg-muted">
                      {item.movie_poster && (
                        <Image src={posterUrl(item.movie_poster, "w200")!} alt={item.movie_title} fill className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.movie_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.type} · {item.editie}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
