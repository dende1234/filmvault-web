import { getFeedbackList } from "@/actions/feedback";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { FEEDBACK_KINDS, FEEDBACK_STATUSES } from "@/lib/feedback";
import type { FeedbackKind, FeedbackStatus } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { AdminFeedbackClient } from "@/components/admin/admin-feedback-client";

export const metadata = { title: "Feedback" };

type StatusFilter = "open" | "all" | FeedbackStatus;

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string }>;
}) {
  const dict = getDictionary(await getLocale());
  const params = await searchParams;
  const status: StatusFilter =
    params.status === "all" || FEEDBACK_STATUSES.includes(params.status as FeedbackStatus) ? (params.status as StatusFilter) : "open";
  const kind: "all" | FeedbackKind = FEEDBACK_KINDS.includes(params.kind as FeedbackKind) ? (params.kind as FeedbackKind) : "all";
  const items = await getFeedbackList({ status, kind });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={dict.admin_feedback_title} description={dict.admin_feedback_description} />
      {items === null ? (
        <p className="text-sm text-destructive">{dict.admin_feedback_not_ready}</p>
      ) : (
        <AdminFeedbackClient items={items} status={status} kind={kind} />
      )}
    </div>
  );
}
