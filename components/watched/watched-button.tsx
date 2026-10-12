"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import type { FilmLog, FilmMeta } from "@/types/database";
import { Button } from "@/components/ui/button";
import { LogFilmDialog } from "@/components/watched/log-film-dialog";

/** Film page action: "Markeer als bekeken", or "Bekeken · 3×" once logged. */
export function WatchedButton({ meta, log, viewingCount }: { meta: FilmMeta; log: FilmLog | null; viewingCount: number }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const watched = log?.watched === true;
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} aria-pressed={watched}>
        <Eye className={watched ? "text-primary" : undefined} />
        {watched ? t("watched_button_count", Math.max(viewingCount, 1)) : t("watched_mark_button")}
      </Button>
      <LogFilmDialog open={open} onOpenChange={setOpen} meta={meta} log={log} mode="log" />
    </>
  );
}
