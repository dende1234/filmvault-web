"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { deleteBarcode, getBarcodesForMovie, updateBarcodeDetails } from "@/actions/collections";
import { EDITIE_OPTIONS, MEDIA_TYPES, type Barcode, type MediaType } from "@/types/database";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function AdminManageFilmsClient() {
  const { t } = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [movie, setMovie] = useState<MovieSummaryDto | null>(null);
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Barcode | null>(null);

  async function selectMovie(m: MovieSummaryDto) {
    setMovie(m);
    setPickerOpen(false);
    setIsLoading(true);
    try {
      setBarcodes(await getBarcodesForMovie(m.id));
    } catch {
      toast.error(t("admin_manage_films_error_load"));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdate(barcode: Barcode, type: MediaType, editie: string) {
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
      <h1 className="text-2xl font-semibold">{t("admin_manage_films_title")}</h1>
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
                    onValueChange={(v) => handleUpdate(barcode, v as MediaType, barcode.editie)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIA_TYPES.map((type) => (
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
                      {EDITIE_OPTIONS.map((editie) => (
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
