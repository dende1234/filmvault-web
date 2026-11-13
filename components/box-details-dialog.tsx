"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { editionLabel } from "@/lib/edition-label";
import { createCollection, getUserCollections } from "@/actions/collections";
import { addKnownBoxToCollections, addNewBoxAsPending, findBarcodesByCode } from "@/actions/barcodes";
import { ownedReleasesReady } from "@/actions/owned-releases";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import type { BoxFilmInput, Collection } from "@/types/database";
import { Poster } from "@/components/movie/poster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export type BoxDraft = {
  films: BoxFilmInput[];
  barcode?: string;
  boxName?: string;
  type?: string;
  editie?: string;
  /** Set when the barcode is already a known box: everything but the
   * collections is fixed, and it goes straight into the collection. */
  knownBoxGroupId?: string | null;
};

/** Details + collections for a box, shared by "Box toevoegen" (films picked
 * by hand) and the scanner (a known box arrives fully filled in; an unknown
 * barcode arrives with only the barcode). Mount it with a key per draft. */
export function BoxDetailsDialog({ draft, onClose }: { draft: BoxDraft; onClose: () => void }) {
  const { t, locale } = useT();
  const router = useRouter();
  const known = !!draft.knownBoxGroupId;
  const [ownedReady, setOwnedReady] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [edities, setEdities] = useState<string[]>([]);
  const [boxName, setBoxName] = useState(draft.boxName ?? "");
  const [barcode, setBarcode] = useState(draft.barcode ?? "");
  const [type, setType] = useState<string>(draft.type ?? "DVD");
  const [editie, setEditie] = useState(draft.editie ?? "Normaal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getUserCollections(), getMediaTypes(), getEdities(), ownedReleasesReady()]).then(([cols, types, eds, ready]) => {
      setOwnedReady(ready);
      setCollections(cols);
      setMediaTypes(types);
      setEdities(eds);
      if (cols.length === 1) setSelectedCollections(new Set([cols[0].id]));
      if (!draft.type) setType(types[0] ?? "DVD");
      if (!draft.editie) setEditie(eds[0] ?? "Normaal");
    }).catch(() => setError(t("add_to_collection_error_load")));
  }, [draft.type, draft.editie, t]);

  const canSubmit = draft.films.length > 0 && boxName.trim() && barcode.trim() && (selectedCollections.size > 0 || (collections.length === 0 && !!newCollectionName.trim())) && (known || ownedReady) && !isSubmitting;

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    let collectionIds = Array.from(selectedCollections);
    try {
      if (collections.length === 0) {
        const collection = await createCollection(newCollectionName.trim(), null);
        setCollections([collection]);
        setSelectedCollections(new Set([collection.id]));
        collectionIds = [collection.id];
      }
      // Re-check: someone may have registered this barcode as a box meanwhile.
      const boxGroupId = draft.knownBoxGroupId ?? (await findBarcodesByCode(barcode.trim()))[0]?.box_group_id ?? null;
      if (boxGroupId) {
        const alreadyContaining = await addKnownBoxToCollections(
          draft.films,
          boxGroupId,
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
        await addNewBoxAsPending(draft.films, boxName.trim(), barcode.trim(), type, editie || "Normaal", collectionIds);
      }
      toast.success(t(known ? "add_to_collection_added" : "add_to_collection_added_and_submitted"));
      onClose();
      router.refresh();
    } catch {
      setError(t("add_to_collection_error_submit"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5 text-primary" aria-hidden />
            {known ? boxName : t("box_details_dialog_title", draft.films.length)}
          </DialogTitle>
          {known && (
            <DialogDescription>
              {[type, editie !== "Normaal" ? editie : null, t("box_card_film_count", draft.films.length)].filter(Boolean).join(" · ")}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm font-medium">{t("box_dialog_films_title", draft.films.length)}</p>
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {draft.films.map((f) => (
                <li key={f.tmdb_movie_id} className="flex min-w-0 flex-col gap-1">
                  <Poster path={f.movie_poster} title={f.movie_title} size="sm" />
                  <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{f.movie_title}</span>
                </li>
              ))}
            </ul>
          </div>

          {!known && (
            <>
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
                        {editionLabel(e, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">{t("add_to_collection_select_collections")}</p>
            <div className="flex flex-col gap-1.5">
              {collections.length === 0 && <Input aria-label={t("collections_new_title")} placeholder={t("owned_collection_name")} value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} />}
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

          {!known && !ownedReady && <p role="status" className="text-sm text-warning">{t("owned_save_not_ready")}</p>}
          {info && <p className="text-sm text-muted-foreground">{info}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("action_cancel")}
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {t("action_add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
