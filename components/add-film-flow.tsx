"use client";

import { useState } from "react";
import Link from "next/link";
import { Film, Package, Plus, ScanLine, Store } from "lucide-react";
import { useHasCamera } from "@/lib/use-has-camera";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { lookupScannedBarcode, type ScannedBarcodeResult } from "@/actions/barcodes";
import { suggestTitlesForBarcode, type BarcodeSuggestion } from "@/actions/barcode-suggest";
import { Poster } from "@/components/movie/poster";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MovieMultiSelectPickerDialog, MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog";
import { BoxDetailsDialog, type BoxDraft } from "@/components/box-details-dialog";
import { BarcodeScanButton } from "@/components/barcode-scanner";
import { ScanResultDialog } from "@/components/scan-result-dialog";

type Selected = { id: number; title: string; poster: string | null };

/** Dashboard/Collections entry point: pick a film or series via search, or
 * scan its barcode (only offered when the device has a camera), then add it
 * to one or more collections. A known barcode (film, series or box) opens one
 * screen: whether you already own it, own it in another edition, or not yet,
 * and the collections to put it in, without barcode/format/edition fields.
 * For an unknown one you say whether it is a single title or a box, and the
 * barcode is pre-filled for approval. */
export function AddFilmFlow() {
  const { t } = useT();
  const hasCamera = useHasCamera();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [boxPickerOpen, setBoxPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  const [unknownCode, setUnknownCode] = useState<string | null>(null);
  const [boxDraft, setBoxDraft] = useState<BoxDraft | null>(null);
  const [boxSession, setBoxSession] = useState(0);
  const [lookingUp, setLookingUp] = useState(false);
  // Unknown barcode: what an external barcode database thinks it is.
  const [suggest, setSuggest] = useState<{ code: string; loading: boolean; productTitle: string | null; items: BarcodeSuggestion[] } | null>(null);
  // A known barcode (film, series or box): one screen with what it means for
  // you and the collections to put it in.
  const [scanResult, setScanResult] = useState<Extract<ScannedBarcodeResult, { kind: "title" | "box" }> | null>(null);

  function openBox(draft: BoxDraft) {
    setBoxDraft(draft);
    setBoxSession((s) => s + 1);
  }

  async function onScan(code: string) {
    setLookingUp(true);
    try {
      const result = await lookupScannedBarcode(code);
      if (result.kind === "title" || result.kind === "box") {
        setScanResult(result);
      } else {
        setUnknownCode(result.barcode);
        setSuggest({ code: result.barcode, loading: true, productTitle: null, items: [] });
        suggestTitlesForBarcode(result.barcode)
          .then((r) => setSuggest((cur) => (cur?.code === result.barcode ? { ...cur, loading: false, productTitle: r.productTitle, items: r.suggestions } : cur)))
          .catch(() => setSuggest((cur) => (cur?.code === result.barcode ? { ...cur, loading: false } : cur)));
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
      {hasCamera && (
        <Button asChild variant="ghost">
          <Link href="/collections/scan">
            <ScanLine />
            {t("bulk_scan_button")}
          </Link>
        </Button>
      )}
      {hasCamera && (
        <Button asChild variant="ghost">
          <Link href="/winkelmodus">
            <Store />
            {t("shop_nav")}
          </Link>
        </Button>
      )}
      {lookingUp && <span className="sr-only" role="status">{t("scan_box_loading")}</span>}

      <Dialog open={!!unknownCode} onOpenChange={(open) => !open && setUnknownCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("scan_choice_title")}</DialogTitle>
            <DialogDescription>{t("scan_choice_description", unknownCode ?? "")}</DialogDescription>
          </DialogHeader>
          {suggest?.code === unknownCode && (suggest.loading || suggest.items.length > 0) && (
            <div className="flex flex-col gap-2">
              {suggest.loading ? (
                <p className="text-sm text-muted-foreground">{t("scan_suggest_loading")}</p>
              ) : (
                <>
                  <p className="text-sm">{t("scan_suggest_found", suggest.productTitle ?? "")}</p>
                  <ul className="flex flex-col gap-1.5">
                    {suggest.items.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected({ id: m.id, title: m.title, poster: m.poster });
                            setScanned(unknownCode);
                            setUnknownCode(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg border border-border bg-elevated/40 p-2 text-left transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        >
                          <Poster path={m.poster} title={m.title} size="xs" className="w-10 shrink-0" />
                          <span className="min-w-0 text-sm font-medium">
                            {m.title}
                            {m.year && <span className="font-normal text-muted-foreground"> ({m.year})</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="pt-1 text-xs text-muted-foreground">{t("scan_suggest_or")}</p>
                </>
              )}
            </div>
          )}
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
      {scanResult && <ScanResultDialog key={scanResult.barcode} result={scanResult} onClose={() => setScanResult(null)} />}
      {boxDraft && <BoxDetailsDialog key={boxSession} draft={boxDraft} onClose={() => setBoxDraft(null)} />}
    </>
  );
}
