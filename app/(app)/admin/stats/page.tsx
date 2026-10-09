import { getAppStats } from "@/actions/admin";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminStatsPage() {
  const dict = getDictionary(await getLocale());
  const stats = await getAppStats();

  const rows: [string, number][] = [
    [dict.admin_stats_total_users, stats.total_users],
    [dict.admin_stats_total_collections, stats.total_collections],
    [dict.admin_stats_total_films, stats.total_collection_items],
    [dict.admin_stats_total_posts, stats.total_posts],
    [dict.admin_stats_total_comments, stats.total_comments],
    [dict.admin_stats_total_follows, stats.total_follows],
    [dict.admin_stats_total_lists, stats.total_curated_lists],
    [dict.admin_stats_pending_approvals, stats.pending_approvals],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">{dict.admin_stats_title}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
