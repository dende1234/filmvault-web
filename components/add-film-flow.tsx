"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { lookupScannedBarcode } from "@/actions/collections";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog";
import { BarcodeScanButton } from "@/components/barcode-scanner";

type Selected = { id: number; title: string; poster: string | null };

/** Dashboard/Collections entry point: pick a film or series via search, or
 * scan its barcode (only offered when the device has a camera), then add it
 * to one or more collections. A known barcode skips the search; an unknown
 * one is pre-filled as a new barcode after you pick the title. */
export function AddFilmFlow() {
  const { t } = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);

  async function onScan(code: string) {
    try {
      const result = await lookupScannedBarcode(code);
      if (result.kind === "title") {
        setScanned(result.barcode);
        setSelected(result.title);
      } else if (result.kind === "box") {
        toast(t("scanner_is_box", result.boxName ?? result.barcode));
      } else {
        toast(t("scanner_unknown", result.barcode));
        setScanned(result.barcode);
        setPickerOpen(true);
      }
    } catch {
      toast.error(t("add_to_collection_error_load"));
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
      <MovieSearchPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(movie: MovieSummaryDto) => {
          setSelected({ id: movie.id, title: movie.title, poster: movie.poster_path });
          setPickerOpen(false);
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
    </>
  );
}
