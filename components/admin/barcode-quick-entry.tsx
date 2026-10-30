"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Undo2 } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { isValidEanUpc, normalizeBarcode } from "@/lib/barcode";
import {
  adminGetBarcodesForMovie,
  adminLookupBarcode,
  adminRegisterBarcodeWithConflictTitle,
  type KnownBarcodeEntry,
} from "@/actions/admin";
import { deleteBarcode } from "@/actions/approvals";
import { posterUrl, type MovieSummaryDto } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaTypeEditieSelects } from "@/components/admin/media-type-editie-selects";
import { cn } from "@/lib/utils";
import { isSeries } from "@/lib/titles";
import { getSeriesSeasons, type SeasonOption } from "@/actions/series";
import { SeasonsPicker } from "@/components/seasons-picker";
import { BarcodeScanButton } from "@/components/barcode-scanner";

const TYPE_STORAGE_KEY = "filmvault.admin.station.type";
const EDITIE_STORAGE_KEY = "filmvault.admin.station.editie";

type RecentEntry = { id: string; barcode: string; title: string; type: string; editie: string };

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode / blocked storage — the sticky choice is a convenience only.
  }
}

function KnownEntryRow({ entry }: { entry: KnownBarcodeEntry }) {
  const { t } = useT();
  const poster = posterUrl(entry.poster_path, "w200");
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-10 flex-none overflow-hidden rounded-md bg-muted">
        {poster && <Image src={poster} alt="" fill className="object-cover" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{entry.title}</p>
        <p className="text-xs text-muted-foreground">
          {entry.type} · {entry.editie}
          {entry.is_box && entry.box_name ? ` · ${t("admin_station_box_label", entry.box_name)}` : ""}
        </p>
      </div>
    </div>
  );
}

/** Barcode-first, keyboard-driven entry: barcode → Enter → film search →
 * Enter registers directly (no staging queue), then focus returns to the
 * barcode field for the next one. */
export function BarcodeQuickEntry({ mediaTypes, edities }: { mediaTypes: string[]; edities: string[] }) {
  const { t, locale } = useT();
  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [barcode, setBarcode] = useState("");
  const [phase, setPhase] = useState<"barcode" | "search">("barcode");
  const [known, setKnown] = useState<KnownBarcodeEntry[] | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const [query, setQuery] = useState("");
  const [searchKind, setSearchKind] = useState<"movie" | "tv">("movie");
  const [results, setResults] = useState<MovieSummaryDto[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [existingState, setExistingState] = useState<{ movieId: number; entries: KnownBarcodeEntry[] } | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Sticky choice from a previous session; only used while it's still a valid option.
  const [typeChoice, setTypeChoice] = useState<string | null>(() => readStored(TYPE_STORAGE_KEY));
  const [editieChoice, setEditieChoice] = useState<string | null>(() => readStored(EDITIE_STORAGE_KEY));
  const type = typeChoice && mediaTypes.includes(typeChoice) ? typeChoice : (mediaTypes[0] ?? "DVD");
  const editie = editieChoice && edities.includes(editieChoice) ? editieChoice : (edities[0] ?? "Normaal");
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  const code = normalizeBarcode(barcode);
  const showChecksumWarning = code.length > 0 && !isValidEanUpc(code);
  const visibleResults = query.trim() ? results.slice(0, 9) : [];
  const activeMovie = visibleResults[activeIndex] ?? null;

  useEffect(() => {
    if (phase === "barcode") barcodeRef.current?.focus();
    else searchRef.current?.focus();
  }, [phase]);

  // Debounced TMDB search — same endpoint as MovieSearchPickerDialog.
  useEffect(() => {
    if (phase !== "search") return;
    const trimmed = query.trim();
    if (!trimmed) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ query: trimmed, language: locale, type: searchKind });
      fetch(`/api/tmdb/search?${params.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          setResults(data.results ?? []);
          setActiveIndex(0);
        })
        .catch(() => !cancelled && setResults([]));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, phase, locale, searchKind]);

  // Which editions of the highlighted film are already registered.
  const activeMovieId = activeMovie?.id ?? null;

  // Series: optional seasons for the barcode being registered.
  const [seasonState, setSeasonState] = useState<{ titleId: number; options: SeasonOption[] } | null>(null);
  const [quickSeasons, setQuickSeasons] = useState<number[]>([]);
  useEffect(() => {
    if (activeMovieId === null || !isSeries(activeMovieId)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      getSeriesSeasons(activeMovieId)
        .then((options) => !cancelled && setSeasonState({ titleId: activeMovieId, options }))
        .catch(() => {});
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeMovieId]);
  const seasonOptions = seasonState && seasonState.titleId === activeMovieId ? seasonState.options : [];
  useEffect(() => {
    if (activeMovieId === null) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      adminGetBarcodesForMovie(activeMovieId)
        .then((entries) => !cancelled && setExistingState({ movieId: activeMovieId, entries }))
        .catch(() => {});
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeMovieId]);

  const existingForMovie = existingState && existingState.movieId === activeMovieId ? existingState.entries : [];

  function resetForNext() {
    setBarcode("");
    setQuery("");
    setResults([]);
    setActiveIndex(0);
    setKnown(null);
    setPhase("barcode");
    barcodeRef.current?.focus();
  }

  async function handleBarcodeEnter(override?: string) {
    const lookup = override ? normalizeBarcode(override) : code;
    if (!lookup || isLookingUp) return;
    setIsLookingUp(true);
    try {
      const entries = await adminLookupBarcode(lookup);
      if (entries.length > 0) {
        setKnown(entries);
        barcodeRef.current?.select();
      } else {
        setKnown(null);
        setPhase("search");
      }
    } catch {
      toast.error(t("admin_add_film_error_submit"));
    } finally {
      setIsLookingUp(false);
    }
  }

  async function register(movie: MovieSummaryDto) {
    if (!code || isRegistering) return;
    setIsRegistering(true);
    try {
      const result = await adminRegisterBarcodeWithConflictTitle(movie.id, code, type, editie, isSeries(movie.id) ? quickSeasons : null);
      if (result.error === "duplicate") {
        toast.error(t("admin_add_film_error_duplicate", result.conflictTitle));
        return;
      }
      if (result.error === "other") {
        toast.error(t("admin_add_film_error_submit"));
        return;
      }
      toast.success(t("admin_station_registered", code, movie.title));
      setRecent((prev) => [{ id: result.id, barcode: code, title: movie.title, type, editie }, ...prev].slice(0, 20));
      setQuickSeasons([]);
      resetForNext();
    } finally {
      setIsRegistering(false);
    }
  }

  async function undo(entry: RecentEntry) {
    try {
      await deleteBarcode(entry.id);
      setRecent((prev) => prev.filter((r) => r.id !== entry.id));
      toast(t("admin_station_undone", entry.barcode));
    } catch {
      toast.error(t("admin_add_film_error_submit"));
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(visibleResults.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeMovie) register(activeMovie);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setPhase("barcode");
    } else if (e.altKey && /^Digit[1-9]$/.test(e.code)) {
      // e.code, not e.key: on macOS Alt+digit produces a special character.
      e.preventDefault();
      const index = Number(e.code.slice(5)) - 1;
      if (index < visibleResults.length) setActiveIndex(index);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <MediaTypeEditieSelects
        mediaTypes={mediaTypes}
        edities={edities}
        type={type}
        editie={editie}
        onTypeChange={(v) => {
          setTypeChoice(v);
          writeStored(TYPE_STORAGE_KEY, v);
        }}
        onEditieChange={(v) => {
          setEditieChoice(v);
          writeStored(EDITIE_STORAGE_KEY, v);
        }}
      />

      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Input
            ref={barcodeRef}
            inputMode="numeric"
            autoComplete="off"
            placeholder={t("label_barcode")}
            value={barcode}
            disabled={isLookingUp}
            onChange={(e) => {
              setBarcode(e.target.value);
              setKnown(null);
              if (phase === "search") setPhase("barcode");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleBarcodeEnter();
              }
            }}
            className="h-12 font-mono text-lg tracking-wider"
          />
          <BarcodeScanButton
            iconOnly
            className="size-12"
            onDetected={(scannedCode) => {
              setBarcode(scannedCode);
              setKnown(null);
              handleBarcodeEnter(scannedCode);
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("admin_station_barcode_hint")}</p>
        {showChecksumWarning && (
          <p className="flex items-center gap-1 text-xs text-warning">
            <AlertTriangle className="size-3.5" />
            {t("admin_station_checksum_warning")}
          </p>
        )}
      </div>

      {known && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-sm font-medium">{t("admin_station_known_title")}</p>
          {known.map((entry) => (
            <KnownEntryRow key={entry.id} entry={entry} />
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={resetForNext}>
              {t("admin_station_next_barcode")}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/manage-films">{t("admin_station_manage_link")}</Link>
            </Button>
          </div>
        </div>
      )}

      {phase === "search" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1" role="group" aria-label={t("picker_kind_label")}>
            {(["movie", "tv"] as const).map((k) => (
              <Button key={k} type="button" size="sm" variant={searchKind === k ? "default" : "secondary"} onClick={() => setSearchKind(k)}>
                {t(k === "movie" ? "picker_kind_movies" : "picker_kind_series")}
              </Button>
            ))}
          </div>
          <Input
            ref={searchRef}
            autoComplete="off"
            placeholder={t("movies_search_label")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <p className="text-xs text-muted-foreground">{t("admin_station_search_hint")}</p>

          {visibleResults.length > 0 && (
            <div className="flex flex-col">
              {visibleResults.map((movie, index) => {
                const poster = posterUrl(movie.poster_path, "w200");
                return (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    onDoubleClick={() => register(movie)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-muted",
                      index === activeIndex && "bg-muted ring-2 ring-ring",
                    )}
                  >
                    <span className="w-4 flex-none text-xs text-muted-foreground">{index + 1}</span>
                    <div className="relative h-14 w-10 flex-none overflow-hidden rounded-md bg-muted">
                      {poster && <Image src={poster} alt="" fill className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{movie.title}</p>
                      {movie.release_date && <p className="text-xs text-muted-foreground">{movie.release_date.slice(0, 4)}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeMovie && isSeries(activeMovie.id) && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("series_pick_seasons")}</p>
              <SeasonsPicker seasons={seasonOptions} value={quickSeasons} onChange={setQuickSeasons} />
            </div>
          )}

          {existingForMovie.length > 0 && (
            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">{t("admin_station_existing_for_movie")}</p>
              {existingForMovie.map((entry) => (
                <p key={entry.id}>{t("barcode_type_editie_line", entry.barcode, entry.type, entry.editie)}</p>
              ))}
            </div>
          )}

          <Button disabled={!activeMovie || isRegistering} onClick={() => activeMovie && register(activeMovie)} className="w-fit">
            {t("admin_station_link_button")}
          </Button>
        </div>
      )}

      {recent.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-sm font-medium">{t("admin_station_recent_title")}</p>
          {recent.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {t("admin_add_film_queue_note", entry.title, entry.barcode, entry.type, entry.editie)}
              </span>
              <Button size="sm" variant="ghost" onClick={() => undo(entry)}>
                <Undo2 className="size-4" />
                {t("admin_station_undo")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
