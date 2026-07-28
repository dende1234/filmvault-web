"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { approvePendingBarcode, approvePendingBox, rejectPendingBarcode } from "@/actions/collections";
import type { PendingBarcodeCardItem } from "@/types/database";
import { posterUrl } from "@/types/tmdb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function matches(card: PendingBarcodeCardItem, query: string): boolean {
  const q = query.toLowerCase();
  if (card.kind === "single") return card.item.pending.movie_title.toLowerCase().includes(q);
  return card.boxName.toLowerCase().includes(q) || card.items.some((i) => i.pending.movie_title.toLowerCase().includes(q));
}

export function AdminPendingBarcodesClient({ cards: initialCards }: { cards: PendingBarcodeCardItem[] }) {
  const { t } = useT();
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [query, setQuery] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => (query.trim() ? cards.filter((c) => matches(c, query.trim())) : cards), [cards, query]);

  async function approve(card: PendingBarcodeCardItem) {
    setProcessingIds((prev) => new Set([...prev, ...card.pendingIds]));
    try {
      if (card.kind === "single") await approvePendingBarcode(card.item.pending);
      else await approvePendingBox(card.items.map((i) => i.pending));
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      router.refresh();
    } catch {
      toast.error(t("pending_barcodes_error_action"));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        card.pendingIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  async function reject(card: PendingBarcodeCardItem) {
    setProcessingIds((prev) => new Set([...prev, ...card.pendingIds]));
    try {
      for (const id of card.pendingIds) await rejectPendingBarcode(id);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      router.refresh();
    } catch {
      toast.error(t("pending_barcodes_error_action"));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        card.pendingIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  async function approveAll() {
    for (const card of filtered) await approve(card);
  }

  async function rejectAll() {
    for (const card of filtered) await reject(card);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("pending_approvals_label")}</h1>

      {cards.length > 0 && (
        <>
          <Input placeholder={t("pending_barcodes_search_label")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={approveAll} disabled={filtered.length === 0}>
              {t("pending_barcodes_approve_all_button")}
            </Button>
            <Button variant="outline" size="sm" onClick={rejectAll} disabled={filtered.length === 0}>
              {t("pending_barcodes_reject_all_button")}
            </Button>
          </div>
        </>
      )}

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("pending_barcodes_empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((card) => {
            const isProcessing = card.pendingIds.some((id) => processingIds.has(id));
            const first = card.kind === "single" ? card.item.pending : card.items[0].pending;
            const poster = posterUrl(first.movie_poster, "w200");
            const targetCollectionNames = card.kind === "single" ? card.item.targetCollectionNames : card.items[0].targetCollectionNames;
            return (
              <Card key={card.id}>
                <CardContent className="flex gap-3 pt-5">
                  <div className="relative h-20 w-14 flex-none overflow-hidden rounded-md bg-muted">
                    {poster && <Image src={poster} alt="" fill className="object-cover" />}
                  </div>
                  <div className="flex-1">
                    {card.kind === "box" ? (
                      <p className="font-medium">{t("pending_box_title", card.boxName, card.items.length)}</p>
                    ) : (
                      <p className="font-medium">{card.item.pending.movie_title}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("barcode_type_editie_line", first.barcode, first.type ?? "DVD", first.editie ?? "Normaal")}
                    </p>
                    {card.kind === "box" &&
                      card.items.map((i) => (
                        <p key={i.pending.id} className="text-xs text-muted-foreground">
                          {i.pending.movie_title}
                        </p>
                      ))}
                    {first.submitted_at && (
                      <p className="text-xs text-muted-foreground">{t("pending_barcode_submitted_at", first.submitted_at)}</p>
                    )}
                    {targetCollectionNames.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t("pending_barcode_target_collections", targetCollectionNames.join(", "))}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" disabled={isProcessing} onClick={() => approve(card)}>
                        {t("action_accept")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={isProcessing} onClick={() => reject(card)}>
                        {t("action_reject")}
                      </Button>
                    </div>
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
