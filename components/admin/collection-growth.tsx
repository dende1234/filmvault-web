import { getCollectionGrowthStats } from "@/actions/admin";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function CollectionGrowth() {
  const dict = getDictionary(await getLocale());
  const stats = await getCollectionGrowthStats();
  const ratio = (part: number, whole: number) => whole ? `${part} / ${whole} (${Math.round(part / whole * 100)}%)` : "—";
  return (
    <Card>
      <CardHeader><CardTitle>{dict.growth_collection_title}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!stats ? <p className="text-sm text-muted-foreground">{dict.growth_collection_not_ready}</p> : <>
          <p className="text-sm text-muted-foreground">{dict.growth_collection_definitions}</p>
          <dl className="grid gap-5 sm:grid-cols-2">
            {[
              [dict.growth_first_success, ratio(stats.first_success, stats.signups)],
              [dict.growth_activation, ratio(stats.activated, stats.activation_cohort)],
              [dict.growth_return, ratio(stats.returned, stats.return_cohort)],
              [dict.growth_regular, stats.regular_users],
            ].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 font-display text-xl font-semibold">{value}</dd></div>)}
          </dl>
          <p className="text-xs text-muted-foreground">{dict.growth_cohort_hint} {new Intl.DateTimeFormat(await getLocale(), { dateStyle: "medium", timeZone: "Europe/Amsterdam" }).format(new Date(stats.tracking_since))}</p>
          {stats.by_source.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr><th className="py-2">{dict.admin_growth_source}</th><th>{dict.admin_growth_kpi_signups}</th><th>{dict.growth_activation}</th><th>{dict.growth_return}</th></tr></thead>
            <tbody>{stats.by_source.map((s) => <tr key={s.source} className="border-t border-border"><td className="py-2 pr-3">{s.source}</td><td>{s.signups}</td><td>{ratio(s.activated, s.activation_cohort)}</td><td>{ratio(s.returned, s.return_cohort)}</td></tr>)}</tbody>
          </table></div>}
        </>}
      </CardContent>
    </Card>
  );
}
