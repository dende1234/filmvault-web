"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { MovieMultiSelectPickerDialog } from "@/components/movie-search-picker-dialog";
import { BoxDetailsDialog, type BoxDraft } from "@/components/box-details-dialog";
import { Button } from "@/components/ui/button";

/** "Box toevoegen": pick the films, then name, barcode, format and collections. */
export function AddBoxFlow() {
  const { t } = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<BoxDraft | null>(null);
  const [session, setSession] = useState(0);

  return (
    <>
      <Button variant="secondary" onClick={() => setPickerOpen(true)}>
        <Package />
        {t("dashboard_add_box_button")}
      </Button>
      <MovieMultiSelectPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onConfirm={(movies) => {
          setDraft({ films: movies.map((m) => ({ tmdb_movie_id: m.id, movie_title: m.title, movie_poster: m.poster_path })) });
          setSession((s) => s + 1);
          setPickerOpen(false);
        }}
      />
      {draft && <BoxDetailsDialog key={session} draft={draft} onClose={() => setDraft(null)} />}
    </>
  );
}
