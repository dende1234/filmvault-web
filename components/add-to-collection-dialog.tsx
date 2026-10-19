"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { addBarcodesToCollections, getBarcodesForMovie, getOwnedCopiesOfTitle, getUserCollections, type OwnedCopy } from "@/actions/collections";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import { removeFromWishlistIfCovered } from "@/actions/wishlist";
import { getSeriesSeasons, type SeasonOption } from "@/actions/series";
import { isSeries } from "@/lib/titles";
import { SeasonsPicker, useSeasonsLabel } from "@/components/seasons-picker";
import { BarcodeScanButton } from "@/components/barcode-scanner";
import type { Barcode, Collection, NewBarcodeInput } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AddToCollectionDialog({
  open,
  onOpenChange,
  tmdbMovieId,
  movieTitle,
  moviePoster,
  initialBarcode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tmdbMovieId: number;
  movieTitle: string;
  moviePoster: string | null;
  /** A scanned barcode: pre-ticked when known for this title, else pre-filled as new. */
  initialBarcode?: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [existingBarcodes, setExistingBarcodes] = useState<Barcode[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedExisting, setSelectedExisting] = useState<Set<string>>(new Set());
  const [staged, setStaged] = useState<NewBarcodeInput[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [edities, setEdities] = useState<string[]>([]);
  const [newBarcodeText, setNewBarcodeText] = useState("");
  const [newBarcodeType, setNewBarcodeType] = useState<string>("DVD");
  const [newBarcodeEditie, setNewBarcodeEditie] = useState("Normaal");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Copies of this title you already own: shown first, so a second copy is a choice.
  const [owned, setOwned] = useState<OwnedCopy[]>([]);
  // Series only: the seasons in the release being added.
  const series = isSeries(tmdbMovieId);
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([]);
  const [newSeasons, setNewSeasons] = useState<number[]>([]);
  const seasonsLabel = useSeasonsLabel();
  const regularTotal = seasonOptions.filter((s) => s.seasonNumber > 0).length;

  useEffect(() => {
    if (!open) return;
    // Resetting loading/error state before kicking off the fetch below is
    // correct here; this effect was already carefully fixed once this
    // session for a real infinite-loop bug (t() was unmemoized) — not
    // restructuring it just to satisfy this lint rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    Promise.all([
      getBarcodesForMovie(tmdbMovieId),
      getUserCollections(),
      getMediaTypes(),
      getEdities(),
      series ? getSeriesSeasons(tmdbMovieId) : Promise.resolve([] as SeasonOption[]),
      getOwnedCopiesOfTitle(tmdbMovieId).catch(() => [] as OwnedCopy[]),
    ])
      .then(([barcodes, cols, types, eds, seasonList, ownedCopies]) => {
        setOwned(ownedCopies);
        setSeasonOptions(seasonList);
        setExistingBarcodes(barcodes);
        setCollections(cols);
        setMediaTypes(types);
        setEdities(eds);
        if (cols.length === 1) setSelectedCollections(new Set([cols[0].id]));
        setNewBarcodeType(types[0] ?? "DVD");
        setNewBarcodeEditie(eds[0] ?? "Normaal");
        if (initialBarcode) {
          const match = barcodes.find((b) => b.barcode.toLowerCase() === initialBarcode.toLowerCase());
          if (match) setSelectedExisting(new Set([match.id]));
          else setNewBarcodeText(initialBarcode);
        }
      })
      .catch(() => setError(t("add_to_collection_error_load")))
      .finally(() => setIsLoading(false));
  }, [open, tmdbMovieId, t, series, initialBarcode]);

  function stageNewBarcode() {
    const trimmed = newBarcodeText.trim();
    if (!trimmed) return;

    const existingMatch = existingBarcodes.find((b) => b.barcode.toLowerCase() === trimmed.toLowerCase());
    if (existingMatch) {
      setSelectedExisting((prev) => new Set(prev).add(existingMatch.id));
      setNewBarcodeText("");
      setInfo(t("add_to_collection_info_barcode_exists"));
      return;
    }
    if (staged.some((s) => s.barcode.toLowerCase() === trimmed.toLowerCase())) {
      setNewBarcodeText("");
      setInfo(t("add_to_collection_info_barcode_staged"));
      return;
    }
    if (series && newSeasons.length === 0) {
      setInfo(t("series_pick_seasons"));
      return;
    }
    setStaged((prev) => [
      ...prev,
      { barcode: trimmed, type: newBarcodeType, editie: newBarcodeEditie || "Normaal", ...(series ? { seasons: newSeasons } : {}) },
    ]);
    setNewBarcodeText("");
    setNewSeasons([]);
    setInfo(null);
  }

  const stagedCount = selectedExisting.size + staged.length;
  const canSubmit = stagedCount > 0 && selectedCollections.size > 0 && !isSubmitting;

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const selectedBarcodes = existingBarcodes.filter((b) => selectedExisting.has(b.id));
      const targetCollectionIds = Array.from(selectedCollections);
      const alreadyContaining = await addBarcodesToCollections(
        selectedBarcodes,
        staged,
        tmdbMovieId,
        movieTitle,
        moviePoster,
        targetCollectionIds,
      );
      // Best-effort auto-cleanup: only when at least one EXISTING (already-known) barcode was
      // part of this submit — that's the only path that inserts directly into collection_items
      // in this same call. A genuinely new barcode goes to pending_barcodes and isn't actually
      // "owned" yet, so removing the wishlist entry here would be premature. Mirrors
      // AddToCollectionViewModel.kt's submit() exactly, including the same accepted edge case for
      // mixed existing+new batches.
      if (selectedBarcodes.length > 0 && alreadyContaining.size < targetCollectionIds.length) {
        removeFromWishlistIfCovered(tmdbMovieId).catch(() => {});
      }
      if (alreadyContaining.size === 0) {
        toast.success(t("add_to_collection_submit_button"));
        onOpenChange(false);
        router.refresh();
      } else {
        const skippedNames = collections.filter((c) => alreadyContaining.has(c.id)).map((c) => c.name).join(", ");
        const allSkipped = alreadyContaining.size === selectedCollections.size;
        setInfo(
          allSkipped
            ? t("add_to_collection_already_in", skippedNames)
            : t("add_to_collection_already_in_partial", skippedNames),
        );
        if (!allSkipped) router.refresh();
      }
    } catch {
      setError(t("add_to_collection_error_submit"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("add_to_collection_dialog_title")}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : (
          <div className="flex flex-col gap-5">
            {owned.length > 0 && (
              <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium">{t("add_to_collection_owned_title")}</p>
                    <p className="text-sm text-muted-foreground">{t("add_to_collection_owned_hint")}</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {owned.map((c) => (
                    <li key={c.itemId} className="flex items-center justify-between gap-3 rounded-md bg-background/60 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {[c.type, c.editie !== "Normaal" ? c.editie : null, c.cut, c.label].filter(Boolean).join(" · ")}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{t("scan_result_in", c.collections.join(", "))}</p>
                      </div>
                      <Button asChild size="sm" variant="ghost" className="shrink-0">
                        <Link href={`/collections/${c.collectionId}/items/${c.itemId}`} onClick={() => onOpenChange(false)}>
                          {t("scan_result_view")}
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-medium">{t("add_to_collection_barcodes_for", movieTitle)}</p>
              {existingBarcodes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("add_to_collection_no_barcodes")}</p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-muted-foreground">{t("add_to_collection_select_instructions")}</p>
                  <div className="flex flex-col gap-1.5">
                    {existingBarcodes.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedExisting.has(b.id)}
                          onCheckedChange={(checked) =>
                            setSelectedExisting((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(b.id);
                              else next.delete(b.id);
                              return next;
                            })
                          }
                        />
                        {t("barcode_type_editie_line", b.barcode, b.type, b.editie)}
                        {series && <span className="text-muted-foreground"> · {seasonsLabel(b.seasons, regularTotal)}</span>}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{t("add_to_collection_new_barcode_label")}</p>
              <div className="flex flex-col gap-2">
                {series && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-muted-foreground">{t("series_pick_seasons")}</p>
                    <SeasonsPicker seasons={seasonOptions} value={newSeasons} onChange={setNewSeasons} />
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder={t("label_barcode")}
                    value={newBarcodeText}
                    onChange={(e) => setNewBarcodeText(e.target.value)}
                    inputMode="numeric"
                  />
                  <BarcodeScanButton
                    iconOnly
                    onDetected={(code) => {
                      const match = existingBarcodes.find((b) => b.barcode.toLowerCase() === code.toLowerCase());
                      if (match) {
                        setSelectedExisting((prev) => new Set(prev).add(match.id));
                        setInfo(t("add_to_collection_info_barcode_exists"));
                      } else setNewBarcodeText(code);
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={newBarcodeType} onValueChange={setNewBarcodeType}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mediaTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newBarcodeEditie} onValueChange={setNewBarcodeEditie}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {edities.map((editie) => (
                        <SelectItem key={editie} value={editie}>
                          {editie}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={stageNewBarcode}>
                    {t("action_add")}
                  </Button>
                </div>
                {staged.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-sm">
                    <span>
                      {t("add_to_collection_staged_note", s.barcode, s.type, s.editie)}
                      {s.seasons && ` · ${seasonsLabel(s.seasons, regularTotal)}`}
                    </span>
                    <button type="button" onClick={() => setStaged((prev) => prev.filter((_, idx) => idx !== i))}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{t("add_to_collection_select_collections")}</p>
              {collections.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("add_to_collection_no_collections")}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {collections.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedCollections.has(c.id)}
                        onCheckedChange={(checked) =>
                          setSelectedCollections((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(c.id);
                            else next.delete(c.id);
                            return next;
                          })
                        }
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {info && <p className="text-sm text-muted-foreground">{info}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("action_cancel")}
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {t("add_to_collection_submit_button", stagedCount)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
