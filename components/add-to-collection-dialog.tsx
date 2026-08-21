"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { addBarcodesToCollections, getBarcodesForMovie, getUserCollections } from "@/actions/collections";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import { removeFromWishlistByMovie } from "@/actions/wishlist";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tmdbMovieId: number;
  movieTitle: string;
  moviePoster: string | null;
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

  useEffect(() => {
    if (!open) return;
    // Resetting loading/error state before kicking off the fetch below is
    // correct here; this effect was already carefully fixed once this
    // session for a real infinite-loop bug (t() was unmemoized) — not
    // restructuring it just to satisfy this lint rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    Promise.all([getBarcodesForMovie(tmdbMovieId), getUserCollections(), getMediaTypes(), getEdities()])
      .then(([barcodes, cols, types, eds]) => {
        setExistingBarcodes(barcodes);
        setCollections(cols);
        setMediaTypes(types);
        setEdities(eds);
        if (cols.length === 1) setSelectedCollections(new Set([cols[0].id]));
        setNewBarcodeType(types[0] ?? "DVD");
        setNewBarcodeEditie(eds[0] ?? "Normaal");
      })
      .catch(() => setError(t("add_to_collection_error_load")))
      .finally(() => setIsLoading(false));
  }, [open, tmdbMovieId, t]);

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
    setStaged((prev) => [...prev, { barcode: trimmed, type: newBarcodeType, editie: newBarcodeEditie || "Normaal" }]);
    setNewBarcodeText("");
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
        removeFromWishlistByMovie(tmdbMovieId).catch(() => {});
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
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{t("add_to_collection_new_barcode_label")}</p>
              <div className="flex flex-col gap-2">
                <Input
                  placeholder={t("label_barcode")}
                  value={newBarcodeText}
                  onChange={(e) => setNewBarcodeText(e.target.value)}
                />
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
                    <span>{t("add_to_collection_staged_note", s.barcode, s.type, s.editie)}</span>
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
