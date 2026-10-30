"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { approvePendingBarcode, approvePendingBox, rejectPendingBarcode } from "@/actions/approvals";
import { adminApprovePendingWithChanges } from "@/actions/admin";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import type { PendingBarcode, PendingBarcodeCardItem } from "@/types/database";
import { posterUrl, type MovieSummaryDto } from "@/types/tmdb";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { MediaTypeEditieSelects } from "@/components/admin/media-type-editie-selects";
import { isSeries } from "@/lib/titles";
import { useSeasonsLabel } from "@/components/seasons-picker";

function matches(card: PendingBarcodeCardItem, query: string): boolean {
  const q = query.toLowerCase();
  if (card.kind === "single") return card.item.pending.movie_title.toLowerCase().includes(q);
  return card.boxName.toLowerCase().includes(q) || card.items.some((i) => i.pending.movie_title.toLowerCase().includes(q));
}

/** Correct film/type/editie of a single submission, then approve it. */
function PendingEditDialog({
  pending,
  onOpenChange,
  onApproved,
}: {
  pending: PendingBarcode | null;
  onOpenChange: (open: boolean) => void;
  onApproved: (pendingId: string) => void;
}) {
  const { t } = useT();
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [edities, setEdities] = useState<string[]>([]);
  // Remounted per submission (key={pending.id}), so props seed the state once.
  const [movie, setMovie] = useState<Pick<MovieSummaryDto, "id" | "title"> | null>(
    pending ? { id: pending.tmdb_movie_id, title: pending.movie_title } : null,
  );
  const [type, setType] = useState(pending?.type ?? "DVD");
  const [editie, setEditie] = useState(pending?.editie ?? "Normaal");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!pending) return;
    Promise.all([getMediaTypes(), getEdities()]).then(([types, eds]) => {
      setMediaTypes(types);
      setEdities(eds);
    });
  }, [pending]);

  async function save() {
    if (!pending || !movie) return;
    setIsSaving(true);
    try {
      await adminApprovePendingWithChanges(pending.id, movie.id, type, editie);
      onApproved(pending.id);
    } catch {
      toast.error(t("pending_barcodes_error_action"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Dialog open={pending !== null} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pending_edit_title")}</DialogTitle>
          </DialogHeader>
          {pending && (
            <div className="flex flex-col gap-3">
              <p className="font-mono text-sm">{pending.barcode}</p>
              <Button variant="outline" className="justify-start" onClick={() => setPickerOpen(true)}>
                {movie?.title ?? t("pending_edit_change_movie")}
              </Button>
              <MediaTypeEditieSelects
                mediaTypes={mediaTypes.length ? mediaTypes : [type]}
                edities={edities.length ? edities : [editie]}
                type={type}
                editie={editie}
                onTypeChange={setType}
                onEditieChange={setEditie}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  {t("action_cancel")}
                </Button>
                <Button className="flex-1" disabled={!movie || isSaving} onClick={save}>
                  {t("action_accept")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <MovieSearchPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(m) => {
          setMovie(m);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

/** Pending-approval list — shared by /admin/pending-barcodes and the
 * barcode station's "Te keuren" tab. */
export function PendingBarcodesList({ cards: initialCards }: { cards: PendingBarcodeCardItem[] }) {
  const { t, locale } = useT();
  const submittedAt = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { dateStyle: "medium", timeStyle: "short" });
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [query, setQuery] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<PendingBarcode | null>(null);
  const seasonsLabel = useSeasonsLabel();

  // Server re-renders (router.refresh / revalidatePath) hand us fresh cards —
  // adopt them during render rather than in an effect.
  const [prevInitialCards, setPrevInitialCards] = useState(initialCards);
  if (initialCards !== prevInitialCards) {
    setPrevInitialCards(initialCards);
    setCards(initialCards);
  }

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
      {cards.length > 0 && (
        <>
          <SearchInput placeholder={t("pending_barcodes_search_label")} value={query} onValueChange={setQuery} />
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
            const submitter = card.kind === "single" ? card.item.submitter : card.items[0].submitter;
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
                      {isSeries(first.tmdb_movie_id) && ` · ${t("picker_kind_series")} · ${seasonsLabel(first.seasons)}`}
                    </p>
                    {(first.cut || first.label || first.region || first.audio_languages?.length || first.subtitle_languages?.length) && (
                      // Details from the submitter (e.g. a CSV import); they land on the copy when approved.
                      <p className="text-xs text-muted-foreground">
                        {[
                          first.cut,
                          first.label,
                          first.region ? `${t("details_region")}: ${first.region}` : null,
                          first.audio_languages?.length ? `${t("details_audio")}: ${first.audio_languages.map((c) => c.toUpperCase()).join(", ")}` : null,
                          first.subtitle_languages?.length
                            ? `${t("details_subtitles")}: ${first.subtitle_languages.map((c) => c.toUpperCase()).join(", ")}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {card.kind === "box" &&
                      card.items.map((i) => (
                        <p key={i.pending.id} className="text-xs text-muted-foreground">
                          {i.pending.movie_title}
                        </p>
                      ))}
                    {(submitter || first.submitted_at) && (
                      <p className="text-xs text-muted-foreground">
                        {submitter ? (
                          <>
                            {t("pending_barcode_submitted_by")}{" "}
                            <Link href={`/u/${submitter.id}`} className="font-medium text-foreground hover:underline">
                              {submitter.name || submitter.email || t("pending_barcode_submitter_unknown")}
                            </Link>
                            {submitter.name && submitter.email && <span> ({submitter.email})</span>}
                          </>
                        ) : (
                          t("pending_barcode_submitter_unknown")
                        )}
                        {first.submitted_at && <> · {submittedAt.format(new Date(first.submitted_at))}</>}
                      </p>
                    )}
                    {targetCollectionNames.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t("pending_barcode_target_collections", targetCollectionNames.join(", "))}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" disabled={isProcessing} onClick={() => approve(card)}>
                        {t("action_accept")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={isProcessing} onClick={() => reject(card)}>
                        {t("action_reject")}
                      </Button>
                      {card.kind === "single" && (
                        <Button size="sm" variant="outline" disabled={isProcessing} onClick={() => setEditing(card.item.pending)}>
                          {t("pending_edit_approve_button")}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PendingEditDialog
        key={editing?.id ?? "none"}
        pending={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onApproved={(pendingId) => {
          setEditing(null);
          setCards((prev) => prev.filter((c) => !c.pendingIds.includes(pendingId)));
          router.refresh();
        }}
      />
    </div>
  );
}
