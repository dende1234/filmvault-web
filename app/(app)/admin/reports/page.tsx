import { getOpenReports } from "@/actions/content-reports";
import { getComment, getPost } from "@/actions/posts";
import { getList } from "@/actions/curated-lists";
import Link from "next/link";
import { AdminReportsClient } from "@/components/admin/admin-reports-client";
import { BlockedList, RecentContent } from "@/components/admin/moderation-client";
import { getBlockedMembers, getRecentContent } from "@/actions/moderation";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import type { AdminReportUiItem } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const current = tab === "recent" || tab === "blocked" ? tab : "reports";
  const tabs = (
    <div className="mb-4 flex gap-1 border-b border-border" role="tablist">
      {(
        [
          ["reports", "/admin/reports", dict.moderation_tab_reports],
          ["recent", "/admin/reports?tab=recent", dict.moderation_tab_recent],
          ["blocked", "/admin/reports?tab=blocked", dict.moderation_tab_blocked],
        ] as const
      ).map(([key, href, label]) => (
        <Link
          key={key}
          href={href}
          role="tab"
          aria-selected={current === key}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            current === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );

  if (current === "recent") {
    const content = await getRecentContent();
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 font-display text-3xl font-semibold tracking-tight">{dict.moderation_title}</h1>
        {tabs}
        {content === null ? <p className="text-sm text-muted-foreground">{dict.moderation_not_ready}</p> : <RecentContent posts={content.posts} comments={content.comments} locale={locale} />}
      </div>
    );
  }
  if (current === "blocked") {
    const blocked = await getBlockedMembers();
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 font-display text-3xl font-semibold tracking-tight">{dict.moderation_title}</h1>
        {tabs}
        {blocked === null ? <p className="text-sm text-muted-foreground">{dict.moderation_not_ready}</p> : <BlockedList members={blocked} locale={locale} />}
      </div>
    );
  }

  const reports = await getOpenReports();

  const items: AdminReportUiItem[] = await Promise.all(
    reports.map(async (report) => {
      if (report.content_type === "post") {
        const post = await getPost(report.content_id);
        return { report, preview: post?.body ?? "", navigateTargetId: post?.id ?? null };
      }
      if (report.content_type === "comment") {
        const comment = await getComment(report.content_id);
        return { report, preview: comment?.body ?? "", navigateTargetId: comment?.post_id ?? null };
      }
      const list = await getList(report.content_id);
      return { report, preview: list?.name ?? "", navigateTargetId: list?.id ?? null };
    }),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 font-display text-3xl font-semibold tracking-tight">{dict.moderation_title}</h1>
      {tabs}
      <AdminReportsClient items={items} />
    </div>
  );
}
