import { CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { getSystemStatus, type ProbeState } from "@/actions/system-status";
import { getDictionary, format } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const ICON: Record<ProbeState, typeof CheckCircle2> = { ok: CheckCircle2, missing: XCircle, unknown: CircleHelp };
const COLOR: Record<ProbeState, string> = { ok: "text-success", missing: "text-destructive", unknown: "text-muted-foreground" };

export default async function AdminStatusPage() {
  const dict = getDictionary(await getLocale());
  const { migrations, settings } = await getSystemStatus();
  const missing = migrations.filter((m) => m.state === "missing").length;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={dict.admin_status_title} description={dict.admin_status_subtitle} />

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold tracking-tight">{dict.admin_status_migrations}</h2>
            <Badge variant={missing === 0 ? "success" : "warning"}>
              {missing === 0 ? dict.admin_status_all_ok : format(dict.admin_status_missing_count, missing)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{dict.admin_status_migrations_hint}</p>
          <ul className="divide-y divide-border/60">
            {migrations.map((m) => {
              const Icon = ICON[m.state];
              return (
                <li key={m.file} className="flex items-center gap-3 py-2 text-sm">
                  <Icon className={`size-4 shrink-0 ${COLOR[m.state]}`} />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{m.file}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {m.state === "ok"
                      ? dict.admin_status_ok
                      : m.state === "missing"
                        ? dict.admin_status_missing
                        : m.note
                          ? dict.admin_status_not_checkable
                          : format(dict.admin_status_unknown, m.detail ?? "?")}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          <h2 className="font-display text-xl font-semibold tracking-tight">{dict.admin_status_settings}</h2>
          <p className="text-sm text-muted-foreground">{dict.admin_status_settings_hint}</p>
          <ul className="divide-y divide-border/60">
            {settings.map((s) => (
              <li key={s.name} className="flex items-center gap-3 py-2 text-sm">
                {s.present ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                ) : (
                  <XCircle className={`size-4 shrink-0 ${s.required ? "text-destructive" : "text-muted-foreground"}`} />
                )}
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{s.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {s.present ? dict.admin_status_set : s.required ? dict.admin_status_required_missing : dict.admin_status_optional_missing}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
