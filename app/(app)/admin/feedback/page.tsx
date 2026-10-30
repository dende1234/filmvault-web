import Link from "next/link";
import { getFeedbackList } from "@/actions/feedback";
import { getHelpQuestions, listHelpAnswers } from "@/actions/help";
import { requireAdmin } from "@/lib/require-admin";
import { cn } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { FEEDBACK_KINDS, FEEDBACK_STATUSES } from "@/lib/feedback";
import type { FeedbackKind, FeedbackStatus } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { AdminFeedbackClient } from "@/components/admin/admin-feedback-client";
import { AdminHelpQuestions } from "@/components/admin/admin-help-questions";

export const metadata = { title: "Feedback" };

type StatusFilter = "open" | "all" | FeedbackStatus;

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string; tab?: string }>;
}) {
  await requireAdmin();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const params = await searchParams;
  const tabs = (
    <div className="flex gap-1 border-b border-border" role="tablist">
      {[
        { key: "feedback", href: "/admin/feedback", label: dict.admin_feedback_tab },
        { key: "help", href: "/admin/feedback?tab=help", label: dict.admin_help_tab },
      ].map((tab) => {
        const active = (params.tab === "help" ? "help" : "feedback") === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );

  if (params.tab === "help") {
    const [rows, answers] = await Promise.all([getHelpQuestions(), listHelpAnswers()]);
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PageHeader title={dict.admin_feedback_title} description={dict.admin_feedback_description} />
        {tabs}
        {rows === null ? (
          <p className="text-sm text-destructive">{dict.admin_help_not_ready}</p>
        ) : (
          <AdminHelpQuestions rows={rows} answers={answers} dict={dict} locale={locale} />
        )}
      </div>
    );
  }

  const status: StatusFilter =
    params.status === "all" || FEEDBACK_STATUSES.includes(params.status as FeedbackStatus) ? (params.status as StatusFilter) : "open";
  const kind: "all" | FeedbackKind = FEEDBACK_KINDS.includes(params.kind as FeedbackKind) ? (params.kind as FeedbackKind) : "all";
  const items = await getFeedbackList({ status, kind });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={dict.admin_feedback_title} description={dict.admin_feedback_description} />
      {tabs}
      {items === null ? (
        <p className="text-sm text-destructive">{dict.admin_feedback_not_ready}</p>
      ) : (
        <AdminFeedbackClient items={items} status={status} kind={kind} />
      )}
    </div>
  );
}
