"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { deleteBarcode, getBarcodesForMovie, updateBarcodeDetails } from "@/actions/collections";
import { adminRegisterBarcodeWithConflictTitle } from "@/actions/admin";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import type { Barcode } from "@/types/database";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type StagedBarcode = { barcode: string; type: string; editie: string; error?: string };

export function AdminManageFilmsClient() {
  const { t } = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [movie, setMovie] = useState<MovieSummaryDto | null>(null);
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Barcode | null>(null);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [edities, setEdities] = useState<string[]>([]);
  const [newBarcodeText, setNewBarcodeText] = useState("");
  const [newBarcodeType, setNewBarcodeType] = useState("DVD");
  const [newBarcodeEditie, setNewBarcodeEditie] = useState("Normaal");
  const [stagedNewBarcodes, setStagedNewBarcodes] = useState<StagedBarcode[]>([]);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  useEffect(() => {
    Promise.all([getMediaTypes(), getEdities()]).then(([types, eds]) => {
      setMediaTypes(types);
      setEdities(eds);
      setNewBarcodeType(types[0] ?? "DVD");
      setNewBarcodeEditie(eds[0] ?? "Normaal");
    });
  }, []);

  async function selectMovie(m: MovieSummaryDto) {
    setMovie(m);
    setPickerOpen(false);
    setIsLoading(true);
    setNewBarcodeText("");
    setStagedNewBarcodes([]);
    try {
      setBarcodes(await getBarcodesForMovie(m.id));
    } catch {
      toast.error(t("admin_manage_films_error_load"));
    } finally {
      setIsLoading(false);
    }
  }

  function stageNewBarcode() {
    const trimmed = newBarcodeText.trim();
    if (!trimmed) return;
    const alreadyExists =
      barcodes.some((b) => b.barcode.toLowerCase() === trimmed.toLowerCase()) ||
      stagedNewBarcodes.some((s) => s.barcode.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) return;
    setStagedNewBarcodes((prev) => [...prev, { barcode: trimmed, type: newBarcodeType, editie: newBarcodeEditie }]);
    setNewBarcodeText("");
  }

  function removeStagedNewBarcode(index: number) {
    setStagedNewBarcodes((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitStagedBarcodes() {
    if (!movie || stagedNewBarcodes.length === 0) return;
    setIsSubmittingNew(true);
    const remaining: StagedBarcode[] = [];
    let anySucceeded = false;
    for (const item of stagedNewBarcodes) {
      const result = await adminRegisterBarcodeWithConflictTitle(movie.id, item.barcode, item.type, item.editie);
      if (result.error === "duplicate") {
        remaining.push({ ...item, error: t("admin_add_film_error_duplicate", result.conflictTitle) });
      } else if (result.error === "other") {
        remaining.push({ ...item, error: t("admin_manage_films_error_action") });
      } else {
        anySucceeded = true;
      }
    }
    if (anySucceeded) {
      try {
        setBarcodes(await getBarcodesForMovie(movie.id));
      } catch {
        toast.error(t("admin_manage_films_error_load"));
      }
    }
    setStagedNewBarcodes(remaining);
    setIsSubmittingNew(false);
  }

  async function handleUpdate(barcode: Barcode, type: string, editie: string) {
    setProcessingIds((prev) => new Set(prev).add(barcode.id));
    try {
      await updateBarcodeDetails(barcode.id, type, editie);
      setBarcodes((prev) => prev.map((b) => (b.id === barcode.id ? { ...b, type, editie } : b)));
    } catch {
      toast.error(t("admin_manage_films_error_action"));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(barcode.id);
        return next;
      });
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    const barcode = pendingDelete;
    setProcessingIds((prev) => new Set(prev).add(barcode.id));
    try {
      await deleteBarcode(barcode.id);
      setBarcodes((prev) => prev.filter((b) => b.id !== barcode.id));
      setPendingDelete(null);
    } catch {
      toast.error(t("admin_manage_films_error_action"));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(barcode.id);
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t("admin_manage_films_title")}</h1>
      <p className="text-sm text-muted-foreground">{t("admin_manage_films_description")}</p>

      <div>
        <Button variant="outline" onClick={() => setPickerOpen(true)}>
          {movie ? movie.title : t("admin_add_film_pick_movie_button")}
        </Button>
      </div>

      {movie &&
        (isLoading ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : barcodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("admin_manage_films_empty")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {barcodes.map((barcode) => (
              <Card key={barcode.id}>
                <CardContent className="flex flex-wrap items-center gap-2 pt-5">
                  <span className="mr-auto font-mono text-sm">{barcode.barcode}</span>
                  <Select
                    value={barcode.type}
                    onValueChange={(v) => handleUpdate(barcode, v, barcode.editie)}
                  >
                    <SelectTrigger className="w-32">
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
                  <Select
                    value={barcode.editie}
                    onValueChange={(v) => handleUpdate(barcode, barcode.type, v)}
                  >
                    <SelectTrigger className="w-40">
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
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={processingIds.has(barcode.id)}
                    onClick={() => setPendingDelete(barcode)}
                  >
                    {t("action_delete")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

      {movie && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <h2 className="text-lg font-medium">{t("admin_manage_films_new_section_title")}</h2>
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
                {mediaTypes.map((mt) => (
                  <SelectItem key={mt} value={mt}>
                    {mt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newBarcodeEditie} onValueChange={setNewBarcodeEditie}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {edities.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" className="w-fit" disabled={!newBarcodeText.trim()} onClick={stageNewBarcode}>
            {t("admin_manage_films_stage_button")}
          </Button>

          {stagedNewBarcodes.length > 0 && (
            <div className="flex flex-col gap-2">
              {stagedNewBarcodes.map((staged, index) => (
                <div key={`${staged.barcode}-${index}`} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">
                      {t("admin_manage_films_staged_note", staged.barcode, staged.type, staged.editie)}
                    </span>
                    <button onClick={() => removeStagedNewBarcode(index)} aria-label={t("action_delete")}>
                      <X className="size-4" />
                    </button>
                  </div>
                  {staged.error && <p className="text-sm text-destructive">{staged.error}</p>}
                </div>
              ))}
              <Button disabled={isSubmittingNew} onClick={submitStagedBarcodes} className="w-fit">
                {t("admin_manage_films_submit_new_button")}
              </Button>
            </div>
          )}
        </div>
      )}

      <MovieSearchPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={selectMovie} />

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin_manage_films_delete_title")}</DialogTitle>
            <DialogDescription>
              {pendingDelete && t("admin_manage_films_delete_confirm_text", pendingDelete.barcode)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              {t("action_cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("action_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
