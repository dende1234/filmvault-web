"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Package, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import type { OwnedCopy, ScannedBarcodeResult } from "@/actions/collections";
import { cn } from "@/lib/utils";
import { Poster } from "@/components/movie/poster";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Known = Extract<ScannedBarcodeResult, { kind: "title" | "box" }>;

function release(type: string, editie: string, cut?: string | null, label?: string | null) {
  return [type, editie !== "Normaal" ? editie : null, cut, label].filter(Boolean).join(" · ");
}

/** What a scan means for you, before adding anything: you already own this
 * release, you own the title in another edition, or it is new to you. The
 * moment that matters in a shop. */
export function ScanResultDialog({
  result,
  onAdd,
  onClose,
}: {
  result: Known;
  onAdd: () => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const isBox = result.kind === "box";
  const owned = result.owned;
  const other = result.kind === "title" ? result.otherEditions : [];
  const status: "owned" | "other" | "new" = owned.length > 0 ? "owned" : other.length > 0 ? "other" : "new";

  const name = isBox ? (result.boxName ?? result.films[0]?.movie_title ?? "") : result.title.title;
  const poster = isBox ? (result.films[0]?.movie_poster ?? null) : result.title.poster;
  const scanned = isBox ? release(result.type, result.editie) : release(result.release.type, result.release.editie);

  const banner = {
    owned: {
      icon: CheckCircle2,
      title: t(isBox ? "scan_result_box_owned_title" : "scan_result_owned_title"),
      hint: t("scan_result_owned_hint"),
      tone: "border-success/40 bg-success/10 text-success",
    },
    other: {
      icon: AlertTriangle,
      title: t("scan_result_other_title"),
      hint: t("scan_result_other_hint"),
      tone: "border-warning/40 bg-warning/10 text-warning",
    },
    new: {
      icon: Sparkles,
      title: t("scan_result_new_title"),
      hint: t("scan_result_new_hint"),
      tone: "border-primary/40 bg-primary/10 text-primary",
    },
  }[status];
  const Icon = banner.icon;

  const copyHref = (c: OwnedCopy) =>
    isBox && result.boxGroupId ? `/collections/${c.collectionId}/boxes/${result.boxGroupId}` : `/collections/${c.collectionId}/items/${c.itemId}`;

  const list = status === "owned" ? owned : other;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* No auto-focus on "Annuleren": the result is what you look at first. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="sr-only">{banner.title}</DialogTitle>
          <DialogDescription className="sr-only">{banner.hint}</DialogDescription>
        </DialogHeader>

        <div className={cn("flex items-start gap-3 rounded-lg border p-4", banner.tone)} role="status">
          <Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <p className="font-display text-lg font-semibold leading-tight tracking-tight text-foreground">{banner.title}</p>
            <p className="text-sm text-muted-foreground">{banner.hint}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Poster path={poster} title={name} size="sm" className="w-16 shrink-0" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="flex items-center gap-1.5 font-medium leading-snug">
              {isBox && <Package className="size-4 shrink-0 text-primary" aria-hidden />}
              <span className="line-clamp-2">{name}</span>
            </p>
            <p className="text-sm text-muted-foreground">{t("scan_result_scanned", scanned)}</p>
            {isBox && <p className="text-xs text-muted-foreground">{t("box_card_film_count", result.films.length)}</p>}
          </div>
        </div>

        {list.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t("scan_result_your_copies")}</p>
            <ul className="flex flex-col gap-2">
              {list.map((c) => (
                <li key={c.itemId} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-elevated/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{release(c.type, c.editie, c.cut, c.label)}</p>
                    <p className="truncate text-xs text-muted-foreground">{t("scan_result_in", c.collections.join(", "))}</p>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="shrink-0">
                    <Link href={copyHref(c)} onClick={onClose}>
                      {t("scan_result_view")}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("action_cancel")}
          </Button>
          <Button variant={status === "owned" ? "secondary" : "default"} onClick={onAdd}>
            {t(status === "owned" ? "scan_result_add_anyway" : "scan_result_add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
