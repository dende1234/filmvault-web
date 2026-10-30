"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { refreshTitlesBatch } from "@/actions/admin-refresh";
import { Button } from "@/components/ui/button";

/** Walks every title in members' collections and wishlists in batches and
 * shows how far it is. */
export function RefreshTitlesButton() {
  const { t } = useT();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ checked: number; total: number; updated: number } | null>(null);

  async function run() {
    setRunning(true);
    let after: number | null = null;
    let updated = 0;
    try {
      do {
        const r = await refreshTitlesBatch(after);
        if (r.error) {
          toast.error(t("admin_refresh_no_key"));
          return;
        }
        updated += r.updated;
        setProgress({ checked: r.checked, total: r.total, updated });
        after = r.next;
      } while (after !== null);
      toast.success(t("admin_refresh_done", updated));
    } catch {
      toast.error(t("admin_refresh_error"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" onClick={run} disabled={running} className="self-start">
        <RefreshCw className={running ? "size-4 animate-spin" : "size-4"} aria-hidden />
        {t("admin_refresh_button")}
      </Button>
      {progress && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {t("admin_refresh_progress", progress.checked, progress.total, progress.updated)}
        </p>
      )}
    </div>
  );
}
