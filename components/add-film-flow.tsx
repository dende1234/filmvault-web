"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog";

/** Dashboard/Collections entry point: pick a movie via TMDB search, then add it
 * to one or more collections — the manual-entry equivalent of Android's
 * "Snel film scannen" (no camera on web, so this always starts from search). */
export function AddFilmFlow() {
  const { t } = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<MovieSummaryDto | null>(null);

  return (
    <>
      <Button onClick={() => setPickerOpen(true)}>
        <Plus />
        {t("dashboard_add_film_button")}
      </Button>
      <MovieSearchPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(movie) => {
          setSelected(movie);
          setPickerOpen(false);
        }}
      />
      {selected && (
        <AddToCollectionDialog
          open={!!selected}
          onOpenChange={(open) => !open && setSelected(null)}
          tmdbMovieId={selected.id}
          movieTitle={selected.title}
          moviePoster={selected.poster_path}
        />
      )}
    </>
  );
}
