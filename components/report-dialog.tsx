"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/locale-provider";
import { reportContent } from "@/actions/content-reports";
import type { ContentType } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

/** Shared "Rapporteren" dialog used by post/comment detail and curated list
 * detail — mirrors the private ReportDialog composable duplicated in
 * PostDetailScreen.kt/CuratedListDetailScreen.kt on Android, deduplicated
 * here into one component since React doesn't need per-screen copies. */
export function ReportDialog({
  open,
  onOpenChange,
  contentType,
  contentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: ContentType;
  contentId: string;
}) {
  const { t } = useT();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      await reportContent(contentType, contentId, reason.trim() || null);
      onOpenChange(false);
      setReason("");
    } catch {
      setError(t("report_error_submit"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("report_dialog_title")}</DialogTitle>
        </DialogHeader>
        <Textarea placeholder={t("report_reason_label")} value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("action_cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {t("action_report")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
