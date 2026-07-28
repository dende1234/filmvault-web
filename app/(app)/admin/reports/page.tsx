import { getOpenReports } from "@/actions/content-reports";
import { getComment, getPost } from "@/actions/posts";
import { getList } from "@/actions/curated-lists";
import { AdminReportsClient } from "@/components/admin/admin-reports-client";
import type { AdminReportUiItem } from "@/types/database";

export default async function AdminReportsPage() {
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
      <AdminReportsClient items={items} />
    </div>
  );
}
