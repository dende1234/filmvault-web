"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog";

export function AddToCollectionButton({
  tmdbMovieId,
  movieTitle,
  moviePoster,
}: {
  tmdbMovieId: number;
  movieTitle: string;
  moviePoster: string | null;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        {t("movie_add_to_collection_button")}
      </Button>
      <AddToCollectionDialog
        open={open}
        onOpenChange={setOpen}
        tmdbMovieId={tmdbMovieId}
        movieTitle={movieTitle}
        moviePoster={moviePoster}
      />
    </>
  );
}
