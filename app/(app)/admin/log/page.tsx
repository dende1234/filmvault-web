import Link from "next/link";
import { ScrollText } from "lucide-react";
import { getAdminLog } from "@/actions/admin-log";
import type { AdminAction } from "@/lib/admin/log";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ACTIONS: AdminAction[] = [
  "barcode_approve",
  "barcode_approve_with_changes",
  "box_approve",
  "barcode_reject",
  "barcode_restore",
  "barcode_register",
  "barcode_update",
  "barcode_delete",
  "barcode_move",
  "user_admin_on",
  "user_admin_off",
  "user_delete",
  "user_trust_on",
  "user_trust_off",
  "user_block",
  "user_unblock",
  "post_delete",
  "comment_delete",
  "announcement_send",
  "help_answer_save",
  "help_answer_delete",
];

const label = (dict: Dictionary, action: string) => (dict[`admin_log_action_${action}` as keyof Dictionary] as string | undefined) ?? action;

/** Who did what in the admin pages (admin_log.sql). */
export default async function AdminLogPage({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const { action, page } = await searchParams;
  const current = ACTIONS.find((a) => a === action) ?? null;
  const pageNo = Math.max(0, Number(page) || 0);
  const log = await getAdminLog({ action: current, page: pageNo });
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { dateStyle: "medium", timeStyle: "short" });
  const href = (a: string | null, p = 0) => {
    const q = new URLSearchParams();
    if (a) q.set("action", a);
    if (p) q.set("page", String(p));
    const s = q.toString();
    return s ? `/admin/log?${s}` : "/admin/log";
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={dict.admin_log_title} description={dict.admin_log_subtitle} />
      {log === null ? (
        <EmptyState icon={ScrollText} title={dict.admin_log_not_ready} />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {[null, ...ACTIONS].map((a) => (
              <Link
                key={a ?? "all"}
                href={href(a)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  a === current ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {a ? label(dict, a) : dict.admin_log_all}
              </Link>
            ))}
          </div>
          {log.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.admin_log_empty}</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-card border border-border/70 bg-card">
              {log.entries.map((e) => {
                const details = Object.entries(e.details ?? {})
                  .filter(([, v]) => v !== null && v !== undefined && v !== "")
                  .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                  .join(" · ");
                return (
                  <li key={e.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
                    <p>
                      <span className="font-medium">{e.admin_name ?? dict.admin_log_unknown_admin}</span> · {label(dict, e.action)}
                      {e.target_id && <span className="ml-1 font-mono text-xs text-muted-foreground">{e.target_id.slice(0, 80)}</span>}
                    </p>
                    {details && <p className="break-words text-xs text-muted-foreground">{details}</p>}
                    <p className="text-xs text-muted-foreground">{date.format(new Date(e.created_at))}</p>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex gap-2">
            {pageNo > 0 && (
              <Button asChild variant="secondary" size="sm">
                <Link href={href(current, pageNo - 1)}>{dict.action_previous}</Link>
              </Button>
            )}
            {log.more && (
              <Button asChild variant="secondary" size="sm">
                <Link href={href(current, pageNo + 1)}>{dict.action_next}</Link>
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
