"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/locale-provider";
import { adminRegisterBarcodeWithConflictTitle } from "@/actions/admin";
import type { MediaType } from "@/types/database";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";

const MEDIA_TYPES: MediaType[] = ["DVD", "Blu-ray", "VHS", "4K Ultra HD"];

export function AdminAddFilmClient() {
  const { t } = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [movie, setMovie] = useState<MovieSummaryDto | null>(null);
  const [barcode, setBarcode] = useState("");
  const [type, setType] = useState<MediaType>("DVD");
  const [editie, setEditie] = useState("Normaal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canSubmit = barcode.trim().length > 0 && !!movie && !isSubmitting;

  async function handleSubmit() {
    if (!movie || !canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    setInfo(null);
    const result = await adminRegisterBarcodeWithConflictTitle(movie.id, barcode.trim(), type, editie || "Normaal");
    setIsSubmitting(false);
    if (result.error === "duplicate") {
      setError(t("admin_add_film_error_duplicate", result.conflictTitle));
    } else if (result.error === "other") {
      setError(t("admin_add_film_error_submit"));
    } else {
      setInfo(t("admin_add_film_success", movie.title));
      setMovie(null);
      setBarcode("");
      setType("DVD");
      setEditie("Normaal");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("admin_add_film_title")}</h1>
      <p className="text-sm text-muted-foreground">{t("admin_add_film_description")}</p>

      <Button variant="outline" className="w-fit" onClick={() => setPickerOpen(true)}>
        {movie ? movie.title : t("admin_add_film_no_movie_selected")}
      </Button>

      <Input placeholder={t("label_barcode")} value={barcode} onChange={(e) => setBarcode(e.target.value)} />

      <div className="flex gap-2">
        <Select value={type} onValueChange={(v) => setType(v as MediaType)}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEDIA_TYPES.map((mt) => (
              <SelectItem key={mt} value={mt}>
                {mt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="flex-1" placeholder={t("add_to_collection_editie_label")} value={editie} onChange={(e) => setEditie(e.target.value)} />
      </div>

      {info && <p className="text-sm text-muted-foreground">{info}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button disabled={!canSubmit} onClick={handleSubmit}>
        {t("admin_add_film_submit_button")}
      </Button>

      <MovieSearchPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(m) => {
          setMovie(m);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
