import { Activity, Download, Mail, Repeat, UserPlus, Zap } from "lucide-react";
import { getGrowthStats } from "@/actions/admin";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Groei" };

// Day 0 of the 90-day marketing plan (Marketingplan_Filmory_90_dagen.pdf).
const PLAN_START_MS = Date.UTC(2026, 9, 10);

// Working hypotheses from the plan (§5), not forecasts. Index = day 30/60/90.
const TARGETS = {
  signups: [25, 60, 100],
  active: [10, 25, 40],
  activation: [60, 65, 70],
  return: [null, 20, 25],
} as const;

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function planDay(nowMs: number) {
  return Math.max(0, Math.floor((nowMs - PLAN_START_MS) / 86_400_000));
}

export default async function AdminGrowthPage() {
  const dict = getDictionary(await getLocale());
  const stats = await getGrowthStats();

  if (!stats) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <PageHeader title={dict.admin_growth_title} />
        <EmptyState icon={Activity} title={dict.admin_growth_not_ready_title} description={dict.admin_growth_not_ready_description} />
      </div>
    );
  }

  const day = planDay(new Date().getTime());
  // The milestone (day 30 / 60 / 90) currently being worked towards.
  const milestone = day <= 30 ? 0 : day <= 60 ? 1 : 2;
  const activationRate = pct(stats.activated, stats.tracked_signups);
  const returnRate = pct(stats.returned_30d, stats.return_cohort);

  const rows = [
    { label: dict.admin_growth_kpi_signups, value: stats.tracked_signups, unit: "", targets: TARGETS.signups },
    { label: dict.admin_growth_kpi_active, value: stats.active_last_30d, unit: "", targets: TARGETS.active },
    { label: dict.admin_growth_kpi_activation, value: activationRate, unit: "%", targets: TARGETS.activation },
    { label: dict.admin_growth_kpi_return, value: returnRate, unit: "%", targets: TARGETS.return },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        title={dict.admin_growth_title}
        description={format(dict.admin_growth_day, Math.min(day, 90))}
        actions={
          <Button asChild variant="secondary">
            <a href="/api/admin/newsletter" download>
              <Download />
              {dict.admin_growth_export_newsletter}
            </a>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={UserPlus}
          label={dict.admin_growth_kpi_signups}
          value={stats.tracked_signups}
          hint={<p className="text-xs text-muted-foreground">{format(dict.admin_growth_last_30d, stats.signups_last_30d)}</p>}
        />
        <StatTile icon={Zap} label={dict.admin_growth_kpi_activation} value={`${activationRate}%`} />
        <StatTile icon={Repeat} label={dict.admin_growth_kpi_return} value={`${returnRate}%`} />
        <StatTile icon={Mail} label={dict.admin_growth_newsletter} value={stats.newsletter_opt_ins} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{dict.admin_growth_targets_title}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 font-medium">{dict.admin_growth_metric}</th>
                <th className="pb-3 font-medium">{dict.admin_growth_now}</th>
                {[30, 60, 90].map((d, i) => (
                  <th key={d} className={i === milestone ? "pb-3 font-medium text-primary" : "pb-3 font-medium"}>
                    {format(dict.admin_growth_day_short, d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const target = row.targets[milestone];
                return (
                  <tr key={row.label} className="border-t border-border/60">
                    <td className="py-3 pr-4 font-medium">{row.label}</td>
                    <td className="w-48 py-3 pr-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-display text-lg font-semibold tabular-nums">
                          {row.value}
                          {row.unit}
                        </span>
                        {target != null && <Progress value={row.value} max={target} />}
                      </div>
                    </td>
                    {row.targets.map((t, i) => (
                      <td key={i} className={i === milestone ? "py-3 tabular-nums text-primary" : "py-3 tabular-nums text-muted-foreground"}>
                        {t == null ? "–" : `${t}${row.unit}`}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted-foreground">{dict.admin_growth_definitions}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.admin_growth_sources_title}</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.by_source.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.admin_growth_sources_empty}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 font-medium">{dict.admin_growth_source}</th>
                  <th className="pb-3 font-medium">{dict.admin_growth_kpi_signups}</th>
                  <th className="pb-3 font-medium">{dict.admin_growth_activated}</th>
                </tr>
              </thead>
              <tbody>
                {stats.by_source.map((s) => (
                  <tr key={s.source} className="border-t border-border/60">
                    <td className="py-2.5 pr-4 font-mono text-xs">{s.source}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{s.signups}</td>
                    <td className="py-2.5 tabular-nums">
                      {s.activated} <span className="text-muted-foreground">({pct(s.activated, s.signups)}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 text-xs text-muted-foreground">{dict.admin_growth_sources_hint}</p>
        </CardContent>
      </Card>
    </div>
  );
}
