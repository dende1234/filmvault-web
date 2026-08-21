"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { addKnownBoxToCollections, addNewBoxAsPending, findBarcodesByCode, getUserCollections } from "@/actions/collections";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import type { Collection } from "@/types/database";
import type { MovieSummaryDto } from "@/types/tmdb";
import { MovieMultiSelectPickerDialog } from "@/components/movie-search-picker-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function AddBoxFlow() {
  const { t } = useT();
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [films, setFilms] = useState<MovieSummaryDto[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [edities, setEdities] = useState<string[]>([]);
  const [boxName, setBoxName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [type, setType] = useState<string>("DVD");
  const [editie, setEditie] = useState("Normaal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (films) {
      Promise.all([getUserCollections(), getMediaTypes(), getEdities()]).then(([cols, types, eds]) => {
        setCollections(cols);
        setMediaTypes(types);
        setEdities(eds);
        if (cols.length === 1) setSelectedCollections(new Set([cols[0].id]));
        setType(types[0] ?? "DVD");
        setEditie(eds[0] ?? "Normaal");
      });
    }
  }, [films]);

  const canSubmit = !!films && films.length > 0 && boxName.trim() && barcode.trim() && selectedCollections.size > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!films) return;
    setIsSubmitting(true);
    setError(null);
    const boxFilms = films.map((m) => ({ tmdb_movie_id: m.id, movie_title: m.title, movie_poster: m.poster_path }));
    const collectionIds = Array.from(selectedCollections);
    try {
      const existing = await findBarcodesByCode(barcode.trim());
      if (existing.length > 0 && existing[0].box_group_id) {
        const alreadyContaining = await addKnownBoxToCollections(
          boxFilms,
          existing[0].box_group_id,
          boxName.trim(),
          barcode.trim(),
          type,
          editie || "Normaal",
          collectionIds,
        );
        if (alreadyContaining.size > 0) {
          const names = collections.filter((c) => alreadyContaining.has(c.id)).map((c) => c.name).join(", ");
          setInfo(
            alreadyContaining.size === collectionIds.length
              ? t("add_to_collection_already_in", names)
              : t("add_to_collection_already_in_partial", names),
          );
          if (alreadyContaining.size === collectionIds.length) return;
        }
      } else {
        await addNewBoxAsPending(boxFilms, boxName.trim(), barcode.trim(), type, editie || "Normaal", collectionIds);
      }
      toast.success(t("add_to_collection_submit_button"));
      reset();
      router.refresh();
    } catch {
      setError(t("add_to_collection_error_submit"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    setFilms(null);
    setSelectedCollections(new Set());
    setBoxName("");
    setBarcode("");
    setType("DVD");
    setEditie("Normaal");
    setError(null);
    setInfo(null);
  }

  return (
    <>
      <Button variant="outline" onClick={() => setPickerOpen(true)}>
        {t("dashboard_add_box_button")}
      </Button>
      <MovieMultiSelectPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onConfirm={(movies) => {
          setFilms(movies);
          setPickerOpen(false);
        }}
      />

      <Dialog open={!!films} onOpenChange={(open) => !open && reset()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{films ? t("box_details_dialog_title", films.length) : ""}</DialogTitle>
          </DialogHeader>
          {films && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium">{t("box_dialog_films_title", films.length)}</p>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {films.map((f) => (
                  <li key={f.id}>{f.title}</li>
                ))}
              </ul>

              <Input placeholder={t("box_name_label")} value={boxName} onChange={(e) => setBoxName(e.target.value)} />
              <Input placeholder={t("box_barcode_label")} value={barcode} onChange={(e) => setBarcode(e.target.value)} />

              <div className="flex gap-2">
                <Select value={type} onValueChange={setType}>
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
                <Select value={editie} onValueChange={setEditie}>
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

              <div>
                <p className="mb-2 text-sm font-medium">{t("add_to_collection_select_collections")}</p>
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
              </div>

              {info && <p className="text-sm text-muted-foreground">{info}</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={reset}>
              {t("action_cancel")}
            </Button>
            <Button disabled={!canSubmit} onClick={handleSubmit}>
              {t("action_add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
