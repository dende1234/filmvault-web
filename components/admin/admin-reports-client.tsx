"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { dismissReport, resolveReport } from "@/actions/content-reports";
import { deleteComment, deletePost } from "@/actions/posts";
import { deleteList } from "@/actions/curated-lists";
import type { AdminReportUiItem } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AdminReportsClient({ items }: { items: AdminReportUiItem[] }) {
  const { t } = useT();
  const router = useRouter();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  function navigateHref(item: AdminReportUiItem): string | null {
    if (!item.navigateTargetId) return null;
    if (item.report.content_type === "curated_list") return `/lists/${item.navigateTargetId}`;
    return `/feed/${item.navigateTargetId}`;
  }

  async function handleDelete(item: AdminReportUiItem) {
    setProcessingIds((prev) => new Set(prev).add(item.report.id));
    try {
      if (item.report.content_type === "post") await deletePost(item.report.content_id);
      else if (item.report.content_type === "comment") {
        await deleteComment(item.report.content_id, item.navigateTargetId ?? "");
      } else await deleteList(item.report.content_id);
      await resolveReport(item.report.id);
      router.refresh();
    } catch {
      toast.error(t("admin_reports_error_action"));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.report.id);
        return next;
      });
    }
  }

  async function handleDismiss(item: AdminReportUiItem) {
    setProcessingIds((prev) => new Set(prev).add(item.report.id));
    try {
      await dismissReport(item.report.id);
      router.refresh();
    } catch {
      toast.error(t("admin_reports_error_action"));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.report.id);
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admin_reports_empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => {
            const href = navigateHref(item);
            const isProcessing = processingIds.has(item.report.id);
            return (
              <Card key={item.report.id}>
                <CardContent className="flex flex-col gap-2 pt-5">
                  <p className="text-xs text-muted-foreground">
                    {t("admin_reports_content_type", item.report.content_type)}
                  </p>
                  <p className="line-clamp-2 text-sm">{item.preview}</p>
                  {item.report.reason && (
                    <p className="text-xs text-muted-foreground">{t("admin_reports_reason", item.report.reason)}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    {href && (
                      <Button asChild size="sm" variant="outline">
                        <Link href={href}>{t("admin_reports_view_button")}</Link>
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" disabled={isProcessing} onClick={() => handleDelete(item)}>
                      {t("action_delete")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={isProcessing} onClick={() => handleDismiss(item)}>
                      {t("admin_reports_dismiss_button")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
