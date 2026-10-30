import Link from "next/link";
import { BarChart3, Eye, Film, Tv, Wallet } from "lucide-react";
import { getMyStatsRows } from "@/actions/collections";
import { collectionStats } from "@/lib/collection-stats";
import { formatPrice } from "@/lib/purchase";
import { editionLabel } from "@/lib/edition-label";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
import { BarList, MonthColumns } from "@/components/stats/bar-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Statistieken" };

export default async function StatsPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const s = collectionStats(await getMyStatsRows());

  if (s.copies === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title={dict.stats_title} />
        <EmptyState icon={BarChart3} title={dict.stats_empty} />
      </div>
    );
  }

  const section = (title: string, body: React.ReactNode, hint?: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={dict.stats_title} description={dict.stats_subtitle} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Film} label={dict.stats_copies} value={s.copies} />
        <StatTile icon={Tv} label={dict.stats_series} value={s.series} />
        <StatTile icon={Eye} label={dict.watched_label} value={`${Math.round((s.watched / s.copies) * 100)}%`} />
        <StatTile icon={Wallet} label={dict.stats_value} value={s.value.priced ? formatPrice(s.value.total, locale) : "–"} />
      </div>

      {section(dict.stats_per_month, <MonthColumns months={s.perMonth} locale={locale} />, dict.stats_per_month_hint)}

      <div className="grid gap-6 md:grid-cols-2">
        {section(dict.stats_formats, <BarList items={s.byFormat} total={s.copies} emptyText={dict.stats_none} />)}
        {section(
          dict.stats_editions,
          <BarList items={s.byEdition.map((e) => ({ ...e, key: editionLabel(e.key, locale) }))} total={s.copies} emptyText={dict.stats_none} />,
        )}
        {section(dict.stats_labels, <BarList items={s.byLabel} total={s.copies} emptyText={dict.stats_none_labels} />)}
        {section(dict.stats_shops, <BarList items={s.byShop} total={s.value.priced || s.copies} emptyText={dict.stats_none_shops} />)}
      </div>

      {s.value.priced > 0 &&
        section(
          dict.stats_value,
          <div className="flex flex-col gap-3 text-sm">
            <p>
              {format(dict.stats_value_line, formatPrice(s.value.total, locale), s.value.priced, formatPrice(s.value.average ?? 0, locale))}
            </p>
            <ol className="flex flex-col gap-1">
              {s.value.top.map((t, i) => (
                <li key={`${t.title}-${i}`} className="flex justify-between gap-3">
                  <span className="truncate">
                    {i + 1}. {t.title}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{formatPrice(t.price, locale)}</span>
                </li>
              ))}
            </ol>
            <Link href="/collections/print" className="text-xs text-primary hover:underline">
              {dict.stats_print_link}
            </Link>
          </div>,
        )}
    </div>
  );
}
