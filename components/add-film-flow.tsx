"use client";

import { useState } from "react";
import { Film, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { lookupScannedBarcode } from "@/actions/collections";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MovieMultiSelectPickerDialog, MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog";
import { BoxDetailsDialog, type BoxDraft } from "@/components/box-details-dialog";
import { BarcodeScanButton } from "@/components/barcode-scanner";

type Selected = { id: number; title: string; poster: string | null };

/** Dashboard/Collections entry point: pick a film or series via search, or
 * scan its barcode (only offered when the device has a camera), then add it
 * to one or more collections. A known barcode skips the search (a known box
 * opens with its films filled in); for an unknown one you say whether it is a
 * single title or a box, and the barcode is pre-filled for approval. */
export function AddFilmFlow() {
  const { t } = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [boxPickerOpen, setBoxPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const [boxDraft, setBoxDraft] = useState<BoxDraft | null>(null);
  const [boxSession, setBoxSession] = useState(0);
  const [lookingUp, setLookingUp] = useState(false);

  function openBox(draft: BoxDraft) {
    setBoxDraft(draft);
    setBoxSession((s) => s + 1);
  }

  async function onScan(code: string) {
    setLookingUp(true);
    try {
      const result = await lookupScannedBarcode(code);
      if (result.kind === "title") {
        setScanned(result.barcode);
        setSelected(result.title);
      } else if (result.kind === "box") {
        openBox({
          films: result.films,
          barcode: result.barcode,
          boxName: result.boxName ?? "",
          type: result.type,
          editie: result.editie,
          knownBoxGroupId: result.boxGroupId,
        });
      } else {
        setUnknownCode(result.barcode);
      }
    } catch {
      toast.error(t("add_to_collection_error_load"));
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => {
          setScanned(null);
          setPickerOpen(true);
        }}
      >
        <Plus />
        {t("dashboard_add_film_button")}
      </Button>
      <BarcodeScanButton onDetected={onScan} />
      {lookingUp && <span className="sr-only" role="status">{t("scan_box_loading")}</span>}

      <Dialog open={!!unknownCode} onOpenChange={(open) => !open && setUnknownCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("scan_choice_title")}</DialogTitle>
            <DialogDescription>{t("scan_choice_description", unknownCode ?? "")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { icon: Film, label: t("scan_choice_film"), hint: t("scan_choice_film_hint"), box: false },
              { icon: Package, label: t("scan_choice_box"), hint: t("scan_choice_box_hint"), box: true },
            ].map(({ icon: Icon, label, hint, box }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setScanned(unknownCode);
                  setUnknownCode(null);
                  if (box) setBoxPickerOpen(true);
                  else setPickerOpen(true);
                }}
                className="flex flex-col items-start gap-1.5 rounded-lg border border-border bg-elevated/40 p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <Icon className="size-5 text-primary" aria-hidden />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <MovieSearchPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(movie: MovieSummaryDto) => {
          setSelected({ id: movie.id, title: movie.title, poster: movie.poster_path });
          setPickerOpen(false);
        }}
      />
      <MovieMultiSelectPickerDialog
        open={boxPickerOpen}
        onOpenChange={setBoxPickerOpen}
        onConfirm={(movies) => {
          setBoxPickerOpen(false);
          openBox({
            films: movies.map((m) => ({ tmdb_movie_id: m.id, movie_title: m.title, movie_poster: m.poster_path })),
            barcode: scanned ?? "",
          });
          setScanned(null);
        }}
      />
      {selected && (
        <AddToCollectionDialog
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) {
              setSelected(null);
              setScanned(null);
            }
          }}
          tmdbMovieId={selected.id}
          movieTitle={selected.title}
          moviePoster={selected.poster}
          initialBarcode={scanned ?? undefined}
        />
      )}
      {boxDraft && <BoxDetailsDialog key={boxSession} draft={boxDraft} onClose={() => setBoxDraft(null)} />}
    </>
  );
}
