"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { adminRegisterBarcodeWithConflictTitle } from "@/actions/admin";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";

type QueueEntry = {
  movie: MovieSummaryDto;
  barcode: string;
  type: string;
  editie: string;
  error?: string;
};

export function AdminAddFilmClient() {
  const { t } = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [movie, setMovie] = useState<MovieSummaryDto | null>(null);
  const [barcode, setBarcode] = useState("");
  const [type, setType] = useState<string>("DVD");
  const [editie, setEditie] = useState("Normaal");
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [edities, setEdities] = useState<string[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMediaTypes(), getEdities()]).then(([types, eds]) => {
      setMediaTypes(types);
      setEdities(eds);
      setType(types[0] ?? "DVD");
      setEditie(eds[0] ?? "Normaal");
    });
  }, []);

  const canStage = barcode.trim().length > 0 && !!movie;
  const canSubmit = queue.length > 0 && !isSubmitting;

  function handleStage() {
    if (!movie || !canStage) return;
    const trimmed = barcode.trim();
    if (queue.some((q) => q.barcode.toLowerCase() === trimmed.toLowerCase())) return;
    setQueue((prev) => [...prev, { movie, barcode: trimmed, type, editie }]);
    setMovie(null);
    setBarcode("");
    setInfo(null);
  }

  function removeQueueEntry(index: number) {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitAll() {
    setIsSubmitting(true);
    setInfo(null);
    const remaining: QueueEntry[] = [];
    let successCount = 0;
    for (const entry of queue) {
      const result = await adminRegisterBarcodeWithConflictTitle(entry.movie.id, entry.barcode, entry.type, entry.editie);
      if (result.error === "duplicate") {
        remaining.push({ ...entry, error: t("admin_add_film_error_duplicate", result.conflictTitle) });
      } else if (result.error === "other") {
        remaining.push({ ...entry, error: t("admin_add_film_error_submit") });
      } else {
        successCount++;
      }
    }
    setQueue(remaining);
    setIsSubmitting(false);
    if (successCount > 0 || remaining.length === 0) {
      setInfo(
        remaining.length === 0
          ? t("admin_add_film_batch_success", successCount)
          : t("admin_add_film_batch_partial", successCount, remaining.length),
      );
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

      <Button variant="outline" disabled={!canStage} onClick={handleStage} className="w-fit">
        {t("admin_add_film_stage_button")}
      </Button>

      {queue.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {queue.map((entry, index) => (
            <div key={`${entry.movie.id}-${entry.barcode}`} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">
                  {t("admin_add_film_queue_note", entry.movie.title, entry.barcode, entry.type, entry.editie)}
                </span>
                <button onClick={() => removeQueueEntry(index)} aria-label={t("action_delete")}>
                  <X className="size-4" />
                </button>
              </div>
              {entry.error && <p className="text-sm text-destructive">{entry.error}</p>}
            </div>
          ))}
        </div>
      )}

      {info && <p className="text-sm text-muted-foreground">{info}</p>}

      {queue.length > 0 && (
        <Button disabled={!canSubmit} onClick={handleSubmitAll}>
          {t("admin_add_film_submit_all_button")}
        </Button>
      )}

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
