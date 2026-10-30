"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bookmark, Check, Clock, Download, Eye, FileUp, Package, SearchX, Upload } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { editionLabel } from "@/lib/edition-label";
import { parseCsv, toCsv } from "@/lib/csv";
import { normalizeBarcode } from "@/lib/barcode";
import { isSeries } from "@/lib/titles";
import { parseSeasons } from "@/lib/seasons";
import {
  IMPORT_FIELDS,
  type ColumnMapping,
  type ImportField,
  detectColumns,
  detectRatingScale,
  looksLikeHeader,
  normalizeDate,
  normalizeEdition,
  normalizeFormat,
  normalizeKind,
  normalizeRating,
  normalizeWatched,
  normalizeYear,
  primaryTitle,
  splitBoxTitle,
} from "@/lib/import-mapping";
import { parsePrice, type PurchaseInput } from "@/lib/purchase";
import { extractCut, extractLabel, normalizeCut, normalizeRegion, parseLanguages } from "@/lib/copy-details";
import { importBatch, matchImportRows, type ImportFilm, type ImportItem, type ImportResult, type ImportRowMatch, type ImportStatus } from "@/actions/import";
import { createCollection } from "@/actions/collections";
import type { Collection } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { Poster } from "@/components/movie/poster";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { MediaTypeEditieSelects } from "@/components/admin/media-type-editie-selects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MAX_ROWS = 1000;
const BATCH = 25;
const PAGE_SIZE = 50;
const NONE = "none";
const NEW_COLLECTION = "__new__";

type Step = "file" | "columns" | "review" | "done";
type RowStatus = "direct" | "pending" | "watched_only" | "wishlist" | "no_barcode" | "no_match";

type ParsedRow = {
  ref: string;
  line: number;
  title: string;
  year: string | null;
  barcode: string | null;
  format: string;
  edition: string;
  watched: boolean;
  rating: number | null;
  watchedOn: string | null;
  box: string | null;
  kind: "movie" | "tv" | null;
  seasonsText: string;
  /** Per-copy details: own columns, or a cut/label recognised in the edition text. */
  cut: string | null;
  label: string | null;
  region: string | null;
  audio: string[] | null;
  subtitles: string[] | null;
  /** Purchase details (only kept for a copy that goes straight into the collection). */
  purchase: PurchaseInput | null;
  /** Where it is on the shelf (only for a copy that goes straight in). */
  location: string | null;
  /** Letterboxd watchlist row: goes to the wishlist. */
  toWishlist: boolean;
};

/** "Complete serie" etc. needs the series' season count — resolved on import. */
const COMPLETE_RE = /compleet|complete|volledig|integraal|\balle\b|\ball\b/i;

type ReviewRow = ParsedRow & {
  match: ImportRowMatch | null;
  film: ImportFilm | null;
  options: ImportFilm[];
  barcodeInput: string;
  type: string;
  editie: string;
  include: boolean;
};

/** One unit in the review list: a single film, or a box (rows sharing a barcode). */
type Group =
  | { kind: "single"; key: string; row: ReviewRow; status: RowStatus }
  | { kind: "box"; key: string; rows: ReviewRow[]; barcode: string; name: string; status: RowStatus; films: ImportFilm[] };

function rowStatus(row: ReviewRow): RowStatus {
  if (!row.film) return "no_match";
  if (row.toWishlist) return "wishlist";
  const code = normalizeBarcode(row.barcodeInput);
  if (code) {
    const known = row.match?.known;
    const stillMatches = known && !known.isBox && code === row.match?.barcode && known.films.some((f) => f.tmdbId === row.film!.tmdbId);
    return stillMatches ? "direct" : "pending";
  }
  return row.watched || row.rating != null ? "watched_only" : "no_barcode";
}

const STATUS_STYLE: Record<RowStatus, { variant: "success" | "warning" | "secondary" | "outline" | "destructive"; icon: typeof Check }> = {
  direct: { variant: "success", icon: Check },
  pending: { variant: "warning", icon: Clock },
  watched_only: { variant: "secondary", icon: Eye },
  wishlist: { variant: "secondary", icon: Bookmark },
  no_barcode: { variant: "outline", icon: AlertTriangle },
  no_match: { variant: "destructive", icon: SearchX },
};

export function CollectionImport({ collections, mediaTypes, edities }: { collections: Collection[]; mediaTypes: string[]; edities: string[] }) {
  const { t, locale } = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("file");
  const [text, setText] = useState("");
  const [table, setTable] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [filter, setFilter] = useState<RowStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [pickerRef, setPickerRef] = useState<string | null>(null);
  const [target, setTarget] = useState<string>(collections[0]?.id ?? NEW_COLLECTION);
  const [newName, setNewName] = useState("");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importedCollectionId, setImportedCollectionId] = useState<string | null>(null);
  // A Letterboxd export (has a "Letterboxd URI" column): watched/diary/ratings
  // go to "Bekeken", watchlist.csv to the wishlist. Detected from the header
  // and the file name; can be switched in the review step.
  const [letterboxd, setLetterboxd] = useState<"watched" | "watchlist" | null>(null);

  const defaultType = mediaTypes[0] ?? "DVD";
  const defaultEditie = edities[0] ?? "Normaal";
  const columnCount = Math.max(0, ...table.map((r) => r.length));
  const headers = hasHeader && table[0] ? table[0] : Array.from({ length: columnCount }, (_, i) => `#${i + 1}`);
  const dataRows = hasHeader ? table.slice(1) : table;

  // ---------- Step 1: file ----------
  function readTable(content: string, fileName?: string) {
    const parsed = parseCsv(content);
    if (parsed.length === 0) {
      toast.error(t("import_empty_file"));
      return;
    }
    const isLetterboxd = parsed[0].some((h) => h.trim().toLowerCase() === "letterboxd uri");
    setLetterboxd(isLetterboxd ? (fileName && /watchlist/i.test(fileName) ? "watchlist" : "watched") : null);
    const header = looksLikeHeader(parsed[0]);
    setTable(parsed);
    setHasHeader(header);
    setMapping(header ? detectColumns(parsed[0]) : {});
    setStep("columns");
  }

  async function onFile(file: File) {
    readTable(await file.text(), file.name);
  }

  function downloadTemplate() {
    const csv = toCsv([
      ["Titel", "Soort", "Seizoenen", "Jaar", "Barcode", "Formaat", "Editie", "Cut", "Label", "Regio", "Audio", "Ondertitels", "Bekeken", "Rating", "Datum bekeken", "Box"],
      ["Dune: Part Two", "Film", "", "2024", "5051888270935", "4K UHD", "Steelbook", "", "", "Regiovrij", "Engels, Duits", "Nederlands", "ja", "4.5", "2024-03-02", ""],
      ["The Lord of the Rings: The Fellowship of the Ring", "Film", "", "2001", "8717418556432", "Blu-ray", "", "Extended", "", "B", "", "", "ja", "5", "", "The Lord of the Rings Trilogy"],
      ["The Lord of the Rings: The Two Towers", "Film", "", "2002", "8717418556432", "Blu-ray", "", "Extended", "", "B", "", "", "nee", "", "", "The Lord of the Rings Trilogy"],
      ["Drive", "Film", "", "2011", "5060105721625", "4K UHD", "Limited Edition", "", "Second Sight", "", "Engels", "Engels", "ja", "4", "", ""],
      ["Game of Thrones", "Serie", "1-3", "2011", "5051888250005", "Blu-ray", "", "", "", "B", "", "", "ja", "4", "", ""],
    ]);
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "filmory-import-voorbeeld.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Step 2: columns → parse + match ----------
  async function startMatching() {
    if (mapping.title === undefined) {
      toast.error(t("import_title_required"));
      return;
    }
    const cell = (r: string[], f: ImportField) => (mapping[f] !== undefined ? (r[mapping[f]!] ?? "").trim() : "");
    const source = dataRows.filter((r) => cell(r, "title") || cell(r, "barcode"));
    if (source.length === 0) {
      toast.error(t("import_empty_file"));
      return;
    }
    if (source.length > MAX_ROWS) {
      toast.error(t("import_too_many", MAX_ROWS));
      return;
    }
    const scale = detectRatingScale(source.map((r) => cell(r, "rating")));
    // One spreadsheet row can hold a whole box ("Box • Film 1 • Film 2"):
    // it expands to one row per film sharing the barcode, which the review
    // step groups into a single box (same as rows sharing a barcode).
    const parsed: ParsedRow[] = source.flatMap((r, i) => {
      const titleCell = cell(r, "title");
      const box = splitBoxTitle(titleCell);
      const base = {
        line: i + 1 + (hasHeader ? 1 : 0),
        year: normalizeYear(cell(r, "year")),
        barcode: normalizeBarcode(cell(r, "barcode")) || null,
        format: cell(r, "format"),
        edition: cell(r, "edition"),
        // Letterboxd watched/diary/ratings exports have no "watched" column: every row is a film you saw.
        watched:
          letterboxd === "watched" || (letterboxd === null && (normalizeWatched(cell(r, "watched")) || !!normalizeDate(cell(r, "watchedOn")))),
        rating: letterboxd === "watchlist" ? null : normalizeRating(cell(r, "rating"), scale),
        watchedOn: normalizeDate(cell(r, "watchedOn")),
        kind: normalizeKind(cell(r, "kind")) ?? (cell(r, "seasons") ? ("tv" as const) : null),
        seasonsText: cell(r, "seasons"),
        cut: normalizeCut(cell(r, "cut")) ?? extractCut(cell(r, "edition")),
        label: cell(r, "label").trim().slice(0, 80) || extractLabel(cell(r, "edition")),
        region: normalizeRegion(cell(r, "region")) ?? normalizeRegion(cell(r, "edition")),
        audio: parseLanguages(cell(r, "audio")),
        subtitles: parseLanguages(cell(r, "subtitles")),
        purchase: {
          price: parsePrice(cell(r, "price")),
          date: normalizeDate(cell(r, "purchaseDate")),
          shop: cell(r, "shop").trim().slice(0, 80) || null,
        },
        location: cell(r, "location").trim().slice(0, 80) || null,
        toWishlist: letterboxd === "watchlist",
      };
      if (box) {
        return box.titles.map((title, j) => ({ ...base, ref: `r${i}_${j}`, title, box: cell(r, "box") || box.boxName }));
      }
      return [{ ...base, ref: `r${i}`, title: primaryTitle(titleCell), box: cell(r, "box") || null }];
    });
    if (parsed.length > MAX_ROWS) {
      toast.error(t("import_too_many", MAX_ROWS));
      setStep("columns");
      return;
    }

    setStep("review");
    const matches: ImportRowMatch[] = [];
    try {
      for (let i = 0; i < parsed.length; i += BATCH) {
        setProgress({ label: "import_matching", done: i, total: parsed.length });
        const batch = parsed.slice(i, i + BATCH);
        matches.push(...(await matchImportRows(batch.map((p) => ({ title: p.title, year: p.year, barcode: p.barcode, kind: p.kind })))));
      }
    } catch {
      toast.error(t("import_error"));
      setProgress(null);
      setStep("columns");
      return;
    }
    setProgress(null);
    setRows(
      parsed.map((p, i) => {
        const match = matches[i];
        const known = match.known;
        const film = known ? known.films[0] : (match.candidates[0] ?? null);
        const row: ReviewRow = {
          ...p,
          match,
          film,
          options: known ? known.films : match.candidates,
          barcodeInput: p.barcode ?? "",
          type: known?.type ?? normalizeFormat(p.format, mediaTypes) ?? defaultType,
          editie: known?.editie ?? normalizeEdition(p.edition, edities) ?? defaultEditie,
          include: true,
        };
        const status = rowStatus(row);
        return { ...row, include: status !== "no_match" && status !== "no_barcode" };
      }),
    );
    setPage(0);
  }

  // ---------- Step 3: review ----------
  const groups: Group[] = useMemo(() => {
    const byCode = new Map<string, ReviewRow[]>();
    for (const r of rows) {
      const code = normalizeBarcode(r.barcodeInput);
      if (code) byCode.set(code, [...(byCode.get(code) ?? []), r]);
    }
    const seen = new Set<string>();
    const out: Group[] = [];
    for (const r of rows) {
      const code = normalizeBarcode(r.barcodeInput);
      const sameCode = code ? byCode.get(code)! : [];
      const distinctFilms = new Set(sameCode.map((x) => x.film?.tmdbId ?? `t:${x.title}`));
      const knownBox = r.match?.known?.isBox && code === r.match.barcode;
      if (code && (knownBox || distinctFilms.size > 1)) {
        if (seen.has(code)) continue;
        seen.add(code);
        const known = r.match?.known?.isBox ? r.match.known : null;
        const films = known ? known.films : sameCode.filter((x) => x.film).map((x) => x.film!);
        const name = sameCode.find((x) => x.box)?.box ?? known?.boxName ?? films.map((f) => f.title).slice(0, 2).join(" + ");
        out.push({ kind: "box", key: `box:${code}`, rows: sameCode, barcode: code, name, films, status: known ? "direct" : "pending" });
      } else {
        out.push({ kind: "single", key: r.ref, row: r, status: rowStatus(r) });
      }
    }
    return out;
  }, [rows]);

  const counts = useMemo(() => {
    const c: Record<RowStatus, number> = { direct: 0, pending: 0, watched_only: 0, wishlist: 0, no_barcode: 0, no_match: 0 };
    for (const g of groups) c[g.status]++;
    return c;
  }, [groups]);

  const visible = filter === "all" ? groups : groups.filter((g) => g.status === filter);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageGroups = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const isIncluded = (g: Group) => (g.kind === "single" ? g.row.include : g.rows.some((r) => r.include));
  const importCount = groups.filter((g) => isIncluded(g) && g.status !== "no_match" && g.status !== "no_barcode").length;
  // Only physical copies need a collection; viewings and wishlist titles don't.
  const needsCollection = groups.some((g) => isIncluded(g) && (g.status === "direct" || g.status === "pending"));

  function updateRows(refs: string[], patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r) => (refs.includes(r.ref) ? { ...r, ...patch } : r)));
  }

  function chooseFilm(ref: string, value: string) {
    if (value === "__search__") {
      setPickerRef(ref);
      return;
    }
    const row = rows.find((r) => r.ref === ref);
    const film = row?.options.find((f) => String(f.tmdbId) === value) ?? null;
    updateRows([ref], { film, include: !!film });
  }

  // ---------- Step 4: import ----------
  async function startImport() {
    let collectionId: string | null = needsCollection ? target : null;
    try {
      if (needsCollection && target === NEW_COLLECTION) {
        if (!newName.trim()) {
          toast.error(t("collections_error_create_name_required"));
          return;
        }
        collectionId = (await createCollection(newName.trim(), null)).id;
      }
    } catch {
      toast.error(t("collections_error_create"));
      return;
    }

    const items: ImportItem[] = [];
    for (const g of groups) {
      if (!isIncluded(g) || g.status === "no_match" || g.status === "no_barcode") continue;
      if (g.kind === "single") {
        const r = g.row;
        items.push({
          kind: "single",
          ref: r.ref,
          film: r.film!,
          barcode: normalizeBarcode(r.barcodeInput) || null,
          type: r.type,
          editie: r.editie,
          ...(isSeries(r.film!.tmdbId)
            ? { seasons: parseSeasons(r.seasonsText), completeSeries: COMPLETE_RE.test(r.seasonsText) }
            : {}),
          watched: r.watched,
          rating: r.rating,
          watchedOn: r.watchedOn,
          details: { cut: r.cut, label: r.label, region: r.region, audioLanguages: r.audio, subtitleLanguages: r.subtitles },
          purchase: r.purchase,
          location: r.location,
          ...(r.toWishlist ? { toWishlist: true, barcode: null } : {}),
        });
      } else {
        const known = g.rows[0].match?.known?.isBox ? g.rows[0].match!.known! : null;
        const viewingFor = (tmdbId: number) => g.rows.find((r) => r.film?.tmdbId === tmdbId);
        items.push({
          kind: "box",
          ref: g.key,
          barcode: g.barcode,
          boxName: g.name,
          type: g.rows[0].type,
          editie: g.rows[0].editie,
          known: known?.boxGroupId ? { boxGroupId: known.boxGroupId, boxName: known.boxName } : null,
          films: g.films.map((f) => {
            const r = viewingFor(f.tmdbId);
            return { ...f, watched: r?.watched ?? false, rating: r?.rating ?? null, watchedOn: r?.watchedOn ?? null };
          }),
        });
      }
    }

    const out: ImportResult[] = [];
    try {
      for (let i = 0; i < items.length; i += BATCH) {
        setProgress({ label: "import_importing", done: i, total: items.length });
        out.push(...(await importBatch(collectionId, items.slice(i, i + BATCH))));
      }
    } catch {
      toast.error(t("import_error"));
    }
    setProgress(null);
    setResults(out);
    setImportedCollectionId(collectionId);
    setStep("done");
    router.refresh();
  }

  function reset() {
    setStep("file");
    setText("");
    setTable([]);
    setRows([]);
    setResults([]);
    setFilter("all");
  }

  const stepIndex = ["file", "columns", "review", "done"].indexOf(step);
  const fieldLabel = (f: ImportField) => t(`import_field_${f}` as Parameters<typeof t>[0]);
  const statusLabel: Record<RowStatus, string> = {
    direct: t("import_status_direct"),
    pending: t("import_status_pending"),
    watched_only: t("import_status_watched_only"),
    wishlist: t("import_status_wishlist"),
    no_barcode: t("import_status_no_barcode"),
    no_match: t("import_status_no_match"),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("import_title")} description={t("import_subtitle")} />

      <ol className="flex flex-wrap gap-2 text-sm">
        {(["import_step_file", "import_step_columns", "import_step_review", "import_step_done"] as const).map((key, i) => (
          <li
            key={key}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1",
              i === stepIndex ? "border-primary/50 bg-primary/10 text-foreground" : "border-border text-muted-foreground",
            )}
          >
            <span className={cn("flex size-5 items-center justify-center rounded-full text-xs font-semibold", i < stepIndex ? "bg-primary text-primary-foreground" : "bg-elevated")}>
              {i < stepIndex ? <Check className="size-3" /> : i + 1}
            </span>
            {t(key)}
          </li>
        ))}
      </ol>

      {progress && (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-5">
            <p className="text-sm font-medium">{t(progress.label as "import_matching", progress.done, progress.total)}</p>
            <Progress value={progress.done} max={progress.total} />
          </CardContent>
        </Card>
      )}

      {step === "file" && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-5">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
                <FileUp className="size-5 text-primary" />
              </span>
              <span className="font-medium">{t("import_upload_label")}</span>
              <span className="max-w-md text-sm text-muted-foreground">{t("import_upload_hint")}</span>
            </button>
            <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("import_paste_placeholder")} className="font-mono text-xs" />
            <div className="flex flex-wrap gap-2">
              <Button disabled={!text.trim()} onClick={() => readTable(text)}>
                <Upload />
                {t("import_next")}
              </Button>
              <Button variant="ghost" onClick={downloadTemplate}>
                <Download />
                {t("import_template")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("import_letterboxd_hint")}</p>
          </CardContent>
        </Card>
      )}

      {step === "columns" && (
        <Card>
          <CardContent className="flex flex-col gap-5 pt-5">
            <p className="text-sm text-muted-foreground">{t("import_columns_hint")}</p>
            <div className="flex items-center gap-3">
              <Checkbox
                id="has-header"
                checked={hasHeader}
                onCheckedChange={(v) => {
                  const on = v === true;
                  setHasHeader(on);
                  setMapping(on && table[0] ? detectColumns(table[0]) : {});
                }}
              />
              <Label htmlFor="has-header">{t("import_has_header")}</Label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_FIELDS.map((field) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <Label>
                    {fieldLabel(field)}
                    {field === "title" && <span className="text-primary"> *</span>}
                  </Label>
                  <Select
                    value={mapping[field] !== undefined ? String(mapping[field]) : NONE}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [field]: v === NONE ? undefined : Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("import_column_none")}</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `#${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("import_preview")}</p>
              <div className="overflow-x-auto rounded-lg border border-border/70">
                <table className="w-full text-xs">
                  <thead className="bg-elevated/60 text-left">
                    <tr>
                      {IMPORT_FIELDS.filter((f) => mapping[f] !== undefined).map((f) => (
                        <th key={f} className="whitespace-nowrap px-3 py-2 font-medium">
                          {fieldLabel(f)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-border/60">
                        {IMPORT_FIELDS.filter((f) => mapping[f] !== undefined).map((f) => (
                          <td key={f} className="max-w-56 truncate px-3 py-2">
                            {r[mapping[f]!]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => setStep("file")}>
                {t("import_back")}
              </Button>
              <Button onClick={startMatching} disabled={mapping.title === undefined}>
                {t("import_next")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && !progress && rows.length > 0 && (
        <div className="flex flex-col gap-5">
          {letterboxd && (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{t("import_letterboxd_title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(letterboxd === "watchlist" ? "import_letterboxd_watchlist" : "import_letterboxd_watched")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {(["watched", "watchlist"] as const).map((mode) => (
                    <Button
                      key={mode}
                      size="sm"
                      variant={letterboxd === mode ? "default" : "secondary"}
                      onClick={() => {
                        setLetterboxd(mode);
                        setRows((prev) =>
                          prev.map((r) => ({
                            ...r,
                            toWishlist: mode === "watchlist",
                            watched: mode === "watched",
                            rating: mode === "watchlist" ? null : r.rating,
                          })),
                        );
                      }}
                    >
                      {t(mode === "watched" ? "import_letterboxd_as_watched" : "import_letterboxd_as_wishlist")}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col gap-1 pt-5">
              <p className="font-medium">{t("import_rules_title")}</p>
              <p className="text-sm text-muted-foreground">{t("import_rules_text")}</p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <FilterChip active={filter === "all"} onClick={() => { setFilter("all"); setPage(0); }}>
              {t("import_filter_all", groups.length)}
            </FilterChip>
            {(Object.keys(counts) as RowStatus[]).filter((s) => counts[s] > 0).map((s) => (
              <FilterChip key={s} active={filter === s} onClick={() => { setFilter(s); setPage(0); }}>
                {statusLabel[s]} ({counts[s]})
              </FilterChip>
            ))}
          </div>

          <ul className="flex flex-col gap-2">
            {pageGroups.map((g) => {
              const style = STATUS_STYLE[g.status];
              const StatusIcon = style.icon;
              const statusBadge = (
                <Badge variant={style.variant}>
                  <StatusIcon />
                  {statusLabel[g.status]}
                </Badge>
              );
              if (g.kind === "box") {
                const refs = g.rows.map((r) => r.ref);
                const included = g.rows.some((r) => r.include);
                return (
                  <li key={g.key} className="flex flex-col gap-3 rounded-card border border-border/70 bg-card p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox checked={included} onCheckedChange={(v) => updateRows(refs, { include: v === true })} className="mt-1" />
                      <Package className="mt-0.5 size-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("import_box_label", g.films.length)} · <span className="font-mono">{g.barcode}</span>
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{g.films.map((f) => f.title).join(", ")}</p>
                      </div>
                      {statusBadge}
                    </div>
                    {g.status === "pending" && (
                      <MediaTypeEditieSelects
                        mediaTypes={mediaTypes}
                        edities={edities}
                        type={g.rows[0].type}
                        editie={g.rows[0].editie}
                        onTypeChange={(v) => updateRows(refs, { type: v })}
                        onEditieChange={(v) => updateRows(refs, { editie: v })}
                      />
                    )}
                  </li>
                );
              }
              const r = g.row;
              const fixedByBarcode = g.status === "direct";
              return (
                <li key={g.key} className={cn("flex flex-col gap-3 rounded-card border border-border/70 bg-card p-3", !r.include && "opacity-60")}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={r.include}
                      disabled={g.status === "no_match" || g.status === "no_barcode"}
                      onCheckedChange={(v) => updateRows([r.ref], { include: v === true })}
                      className="mt-1"
                    />
                    <Poster path={r.film?.poster ?? null} title={r.film?.title ?? r.title} size="xs" className="w-10 shrink-0 rounded-md shadow-none" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {r.film ? `${r.film.title}${r.film.year ? ` (${r.film.year})` : ""}` : r.title}
                        {r.film && isSeries(r.film.tmdbId) && (
                          <Badge variant="outline" className="ml-2 align-middle">
                            {t("picker_kind_series")}
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        #{r.line} · {r.title}
                        {r.year ? ` (${r.year})` : ""}
                        {r.watched && " · "}
                        {r.watched && <Eye className="inline size-3 text-primary" />}
                        {r.rating != null && ` · ★ ${r.rating}`}
                        {[r.cut, r.label, r.region ? `${t("details_region")} ${r.region}` : null, r.audio?.map((c) => c.toUpperCase()).join("/")]
                          .filter(Boolean)
                          .map((d) => ` · ${d}`)}
                      </p>
                    </div>
                    {statusBadge}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
                    {fixedByBarcode ? (
                      <p className="self-center text-xs text-muted-foreground">{r.type} · {editionLabel(r.editie, locale)}</p>
                    ) : (
                      <Select value={r.film ? String(r.film.tmdbId) : undefined} onValueChange={(v) => chooseFilm(r.ref, v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("import_search_other")} />
                        </SelectTrigger>
                        <SelectContent>
                          {r.options.map((f) => (
                            <SelectItem key={f.tmdbId} value={String(f.tmdbId)}>
                              {f.title}
                              {f.year ? ` (${f.year})` : ""}
                            </SelectItem>
                          ))}
                          <SelectItem value="__search__">{t("import_search_other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Input
                      value={r.barcodeInput}
                      onChange={(e) => {
                        const next = { ...r, barcodeInput: e.target.value };
                        const st = rowStatus(next);
                        updateRows([r.ref], { barcodeInput: e.target.value, include: st !== "no_match" && st !== "no_barcode" });
                      }}
                      placeholder={t("import_barcode_placeholder")}
                      inputMode="numeric"
                      className="font-mono text-xs"
                    />
                  </div>
                  {r.film && isSeries(r.film.tmdbId) && !fixedByBarcode && (
                    <Input
                      value={r.seasonsText}
                      onChange={(e) => updateRows([r.ref], { seasonsText: e.target.value })}
                      placeholder={t("import_seasons_placeholder")}
                      aria-label={t("import_field_seasons")}
                      className="text-xs"
                    />
                  )}
                  {g.status === "pending" && (
                    <MediaTypeEditieSelects
                      mediaTypes={mediaTypes}
                      edities={edities}
                      type={r.type}
                      editie={r.editie}
                      onTypeChange={(v) => updateRows([r.ref], { type: v })}
                      onEditieChange={(v) => updateRows([r.ref], { editie: v })}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                {t("action_previous")}
              </Button>
              <span className="text-sm tabular-nums text-muted-foreground">{t("import_page_of", page + 1, pages)}</span>
              <Button variant="secondary" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
                {t("action_next")}
              </Button>
            </div>
          )}

          <Card className="sticky bottom-20 md:bottom-4">
            <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-end">
              {needsCollection ? (
              <div className="flex flex-1 flex-col gap-1.5">
                <Label>{t("import_target")}</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_COLLECTION}>{t("import_target_new")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              ) : (
                <p className="flex-1 text-sm text-muted-foreground">{t("import_no_collection_needed")}</p>
              )}
              {needsCollection && target === NEW_COLLECTION && (
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("import_target_new_name")}
                  className="sm:flex-1"
                  aria-label={t("import_target_new_name")}
                />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep("columns")}>
                  {t("import_back")}
                </Button>
                <Button onClick={startImport} disabled={importCount === 0}>
                  {t("import_start", importCount)}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "done" && (
        <Card>
          <CardContent className="flex flex-col gap-5 pt-5">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{t("import_done_title")}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(["added", "already", "pending", "watched_only", "wishlist", "skipped", "error"] as ImportStatus[]).map((s) => {
                const n = results.filter((r) => r.status === s).length;
                if (n === 0) return null;
                return (
                  <div key={s} className="rounded-lg border border-border/70 bg-elevated/40 p-3">
                    <p className="font-display text-2xl font-semibold tabular-nums">{n}</p>
                    <p className="text-xs text-muted-foreground">{t(`import_result_${s}` as "import_result_added")}</p>
                  </div>
                );
              })}
            </div>
            {results.some((r) => r.status === "pending") && <p className="text-sm text-muted-foreground">{t("import_done_pending_hint")}</p>}
            <div className="flex flex-wrap gap-2">
              {importedCollectionId && (
                <Button asChild>
                  <Link href={`/collections/${importedCollectionId}`}>{t("import_go_collection")}</Link>
                </Button>
              )}
              {results.some((r) => r.status === "watched_only") && (
                <Button asChild variant="secondary">
                  <Link href="/watched">{t("import_go_watched")}</Link>
                </Button>
              )}
              {results.some((r) => r.status === "wishlist") && (
                <Button asChild variant="secondary">
                  <Link href="/wishlist">{t("import_go_wishlist")}</Link>
                </Button>
              )}
              <Button variant="ghost" onClick={reset}>
                {t("import_again")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <MovieSearchPickerDialog
        open={pickerRef !== null}
        onOpenChange={(o) => !o && setPickerRef(null)}
        onSelect={(m) => {
          if (!pickerRef) return;
          const film: ImportFilm = { tmdbId: m.id, title: m.title, poster: m.poster_path, year: m.release_date?.slice(0, 4) || null };
          setRows((prev) =>
            prev.map((r) =>
              r.ref === pickerRef
                ? { ...r, film, options: r.options.some((o) => o.tmdbId === film.tmdbId) ? r.options : [film, ...r.options], include: true }
                : r,
            ),
          );
          setPickerRef(null);
        }}
      />
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
