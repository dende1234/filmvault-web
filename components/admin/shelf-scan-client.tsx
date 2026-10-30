"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, Check, Clock, Loader2, Package, SearchX } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { normalizeBarcode } from "@/lib/barcode";
import { normalizeFormat } from "@/lib/import-mapping";
import { isSeries } from "@/lib/titles";
import { MAX_IMAGE_INPUT_BYTES, toJpeg } from "@/lib/resize-image";
import { importBatch, matchImportRows, type ImportFilm, type ImportItem, type ImportResult, type ImportRowMatch, type ImportStatus } from "@/actions/import";
import { getKnownReleases, type KnownSingleRelease } from "@/actions/shelf-scan";
import { createCollection } from "@/actions/collections";
import type { ShelfItem } from "@/lib/ai/shelf-scan";
import type { Collection } from "@/types/database";
import { PageHeader } from "@/components/page-header";
import { Poster } from "@/components/movie/poster";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { MediaTypeEditieSelects } from "@/components/admin/media-type-editie-selects";
import { BarcodeScanButton } from "@/components/barcode-scanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const BATCH = 25;
const MAX_EDGE = 2000;
const NEW_COLLECTION = "__new__";
const SEARCH = "__search__";
const OTHER_RELEASE = "__other__";

/** Spine words → the names normalizeFormat() knows. */
const FORMAT_WORD: Record<ShelfItem["format"], string> = { dvd: "dvd", bluray: "blu-ray", "4k": "4k", unknown: "" };

type RowStatus = "direct" | "pending" | "no_barcode" | "no_match" | "box";

type Row = {
  ref: string;
  item: ShelfItem;
  film: ImportFilm | null;
  options: ImportFilm[];
  releases: KnownSingleRelease[];
  barcodeInput: string;
  type: string;
  editie: string;
  include: boolean;
};

function rowStatus(row: Row): RowStatus {
  if (row.item.is_box) return "box";
  if (!row.film) return "no_match";
  const code = normalizeBarcode(row.barcodeInput);
  if (!code) return "no_barcode";
  return row.releases.some((r) => normalizeBarcode(r.barcode) === code) ? "direct" : "pending";
}

const STATUS_STYLE: Record<RowStatus, { variant: "success" | "warning" | "outline" | "destructive" | "secondary"; icon: typeof Check }> = {
  direct: { variant: "success", icon: Check },
  pending: { variant: "warning", icon: Clock },
  no_barcode: { variant: "outline", icon: AlertTriangle },
  no_match: { variant: "destructive", icon: SearchX },
  box: { variant: "secondary", icon: Package },
};

const canInclude = (s: RowStatus) => s === "direct" || s === "pending";

/** The release whose media type matches what the spine looks like; a single
 * known release is picked even when the format couldn't be read. */
function pickRelease(releases: KnownSingleRelease[], format: ShelfItem["format"]): KnownSingleRelease | null {
  const types = Array.from(new Set(releases.map((r) => r.type)));
  const wanted = normalizeFormat(FORMAT_WORD[format], types);
  const sameType = releases.filter((r) => r.type === wanted);
  if (sameType.length === 1) return sameType[0];
  if (releases.length === 1) return releases[0];
  return null;
}

export function ShelfScanClient({ collections, mediaTypes, edities }: { collections: Collection[]; mediaTypes: string[]; edities: string[] }) {
  const { t } = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef(0);

  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<"scan" | "import" | null>(null);
  const [pickerRef, setPickerRef] = useState<string | null>(null);
  const [target, setTarget] = useState<string>(collections[0]?.id ?? NEW_COLLECTION);
  const [newName, setNewName] = useState("");
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [importedCollectionId, setImportedCollectionId] = useState<string | null>(null);

  const defaultType = mediaTypes[0] ?? "DVD";
  const defaultEditie = edities[0] ?? "Normaal";

  function withRelease(row: Row, release: KnownSingleRelease | null): Row {
    const next: Row = release
      ? { ...row, barcodeInput: release.barcode, type: release.type, editie: release.editie }
      : { ...row, barcodeInput: "", type: normalizeFormat(FORMAT_WORD[row.item.format], mediaTypes) ?? defaultType, editie: defaultEditie };
    return { ...next, include: canInclude(rowStatus(next)) };
  }

  async function scanPhoto(file: File) {
    if (file.size > MAX_IMAGE_INPUT_BYTES) {
      toast.error(t("admin_shelf_scan_error_too_large"));
      return;
    }
    setBusy("scan");
    setResults(null);
    try {
      const form = new FormData();
      form.append("photo", await toJpeg(file, MAX_EDGE), "shelf.jpg");
      const res = await fetch("/api/admin/shelf-scan", { method: "POST", body: form });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(t(error === "unavailable" ? "admin_shelf_scan_error_unavailable" : error === "rate_limited" ? "rate_limited" : "admin_shelf_scan_error"));
        return;
      }
      const { items } = (await res.json()) as { items: ShelfItem[] };
      if (items.length === 0) {
        toast.info(t("admin_shelf_scan_nothing_found"));
        return;
      }

      const matches: ImportRowMatch[] = [];
      for (let i = 0; i < items.length; i += BATCH) {
        const batch = items.slice(i, i + BATCH);
        matches.push(
          ...(await matchImportRows(
            batch.map((it) => ({ title: it.title, year: it.year, barcode: null, kind: it.kind === "unknown" ? null : it.kind })),
          )),
        );
      }
      const films = matches.map((m) => m.candidates[0] ?? null);
      const releases = await getKnownReleases(films.filter((f): f is ImportFilm => !!f).map((f) => f.tmdbId));

      const fresh = items.map((item, i) => {
        const film = films[i];
        const known = film ? (releases[film.tmdbId] ?? []) : [];
        const row: Row = {
          ref: `s${nextRef.current++}`,
          item,
          film,
          options: matches[i].candidates,
          releases: known,
          barcodeInput: "",
          type: defaultType,
          editie: defaultEditie,
          include: false,
        };
        return withRelease(row, pickRelease(known, item.format));
      });
      setRows((prev) => [...prev, ...fresh]);
      toast.success(t("admin_shelf_scan_found", items.length));
    } catch {
      toast.error(t("admin_shelf_scan_error"));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function updateRow(ref: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.ref !== ref) return r;
        const next = { ...r, ...patch };
        return "include" in patch ? next : { ...next, include: canInclude(rowStatus(next)) };
      }),
    );
  }

  async function setFilm(ref: string, film: ImportFilm) {
    const row = rows.find((r) => r.ref === ref);
    if (!row) return;
    let known: KnownSingleRelease[] = [];
    try {
      known = (await getKnownReleases([film.tmdbId]))[film.tmdbId] ?? [];
    } catch {
      // No releases → the barcode field is still there.
    }
    const options = row.options.some((o) => o.tmdbId === film.tmdbId) ? row.options : [film, ...row.options];
    const next = withRelease({ ...row, film, options, releases: known }, pickRelease(known, row.item.format));
    setRows((prev) => prev.map((r) => (r.ref === ref ? next : r)));
  }

  function chooseFilm(ref: string, value: string) {
    if (value === SEARCH) {
      setPickerRef(ref);
      return;
    }
    const film = rows.find((r) => r.ref === ref)?.options.find((f) => String(f.tmdbId) === value);
    if (film) void setFilm(ref, film);
  }

  function chooseRelease(ref: string, value: string) {
    const row = rows.find((r) => r.ref === ref);
    if (!row) return;
    const release = value === OTHER_RELEASE ? null : (row.releases.find((r) => r.barcode === value) ?? null);
    const next = withRelease(row, release);
    setRows((prev) => prev.map((r) => (r.ref === ref ? next : r)));
  }

  async function startImport() {
    let collectionId = target;
    try {
      if (target === NEW_COLLECTION) {
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

    const items: ImportItem[] = rows
      .filter((r) => r.include && canInclude(rowStatus(r)))
      .map((r) => ({
        kind: "single",
        ref: r.ref,
        film: r.film!,
        barcode: normalizeBarcode(r.barcodeInput),
        type: r.type,
        editie: r.editie,
        watched: false,
        rating: null,
        watchedOn: null,
      }));

    setBusy("import");
    const out: ImportResult[] = [];
    try {
      for (let i = 0; i < items.length; i += BATCH) out.push(...(await importBatch(collectionId, items.slice(i, i + BATCH))));
    } catch {
      toast.error(t("import_error"));
    }
    setBusy(null);
    setResults(out);
    setImportedCollectionId(collectionId);
    const done = new Set(out.filter((r) => r.status !== "error").map((r) => r.ref));
    setRows((prev) => prev.filter((r) => !done.has(r.ref)));
    router.refresh();
  }

  const statusLabel: Record<RowStatus, string> = {
    direct: t("import_status_direct"),
    pending: t("import_status_pending"),
    no_barcode: t("import_status_no_barcode"),
    no_match: t("import_status_no_match"),
    box: t("admin_shelf_scan_status_box"),
  };
  const importCount = rows.filter((r) => r.include && canInclude(rowStatus(r))).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin_shelf_scan_title")} description={t("admin_shelf_scan_subtitle")} />

      <Card>
        <CardContent className="flex flex-col gap-3 pt-5">
          <p className="text-sm text-muted-foreground">{t("admin_shelf_scan_hint")}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void scanPhoto(file);
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={busy !== null} className="self-start">
            {busy === "scan" ? <Loader2 className="animate-spin" /> : <Camera />}
            {busy === "scan" ? t("admin_shelf_scan_scanning") : rows.length > 0 ? t("admin_shelf_scan_another") : t("admin_shelf_scan_take_photo")}
          </Button>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-5">
            <h2 className="font-display text-xl font-semibold tracking-tight">{t("import_done_title")}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(["added", "already", "pending", "error"] as ImportStatus[]).map((s) => {
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
            {importedCollectionId && (
              <Button asChild variant="secondary" className="self-start">
                <Link href={`/collections/${importedCollectionId}`}>{t("import_go_collection")}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {rows.map((r) => {
              const status = rowStatus(r);
              const style = STATUS_STYLE[status];
              const Icon = style.icon;
              const selectedRelease = r.releases.find((rel) => normalizeBarcode(rel.barcode) === normalizeBarcode(r.barcodeInput));
              return (
                <li key={r.ref} className={cn("flex flex-col gap-3 rounded-card border border-border/70 bg-card p-3", !r.include && "opacity-60")}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={r.include}
                      disabled={!canInclude(status)}
                      onCheckedChange={(v) => updateRow(r.ref, { include: v === true })}
                      className="mt-1"
                    />
                    <Poster path={r.film?.poster ?? null} title={r.film?.title ?? r.item.title} size="xs" className="w-10 shrink-0 rounded-md shadow-none" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {r.film ? `${r.film.title}${r.film.year ? ` (${r.film.year})` : ""}` : r.item.title}
                        {r.film && isSeries(r.film.tmdbId) && (
                          <Badge variant="outline" className="ml-2 align-middle">
                            {t("picker_kind_series")}
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t("admin_shelf_scan_read_as", r.item.title)}
                        {r.item.confidence === "low" && ` · ${t("admin_shelf_scan_low_confidence")}`}
                      </p>
                    </div>
                    <Badge variant={style.variant} className="shrink-0 gap-1">
                      <Icon className="size-3" />
                      {statusLabel[status]}
                    </Badge>
                  </div>

                  {status === "box" ? (
                    <p className="text-xs text-muted-foreground">{t("admin_shelf_scan_box_hint")}</p>
                  ) : (
                    <>
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
                          <SelectItem value={SEARCH}>{t("import_search_other")}</SelectItem>
                        </SelectContent>
                      </Select>

                      {r.film && (
                        <div className="grid gap-2 sm:grid-cols-[1fr_14rem]">
                          {r.releases.length > 0 ? (
                            <Select value={selectedRelease?.barcode ?? OTHER_RELEASE} onValueChange={(v) => chooseRelease(r.ref, v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {r.releases.map((rel) => (
                                  <SelectItem key={rel.barcode} value={rel.barcode}>
                                    {rel.type} · {rel.editie} · {rel.barcode}
                                  </SelectItem>
                                ))}
                                <SelectItem value={OTHER_RELEASE}>{t("admin_shelf_scan_other_release")}</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="self-center text-xs text-muted-foreground">{t("admin_shelf_scan_no_releases")}</p>
                          )}
                          <div className="flex gap-2">
                            <Input
                              value={r.barcodeInput}
                              onChange={(e) => updateRow(r.ref, { barcodeInput: e.target.value })}
                              placeholder={t("import_barcode_placeholder")}
                              inputMode="numeric"
                              className="font-mono text-xs"
                            />
                            <BarcodeScanButton iconOnly onDetected={(code) => updateRow(r.ref, { barcodeInput: code })} />
                          </div>
                        </div>
                      )}

                      {status === "pending" && (
                        <MediaTypeEditieSelects
                          mediaTypes={mediaTypes}
                          edities={edities}
                          type={r.type}
                          editie={r.editie}
                          onTypeChange={(v) => updateRow(r.ref, { type: v })}
                          onEditieChange={(v) => updateRow(r.ref, { editie: v })}
                        />
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          <Card className="sticky bottom-20 md:bottom-4">
            <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-end">
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
              {target === NEW_COLLECTION && (
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("import_target_new_name")}
                  className="sm:flex-1"
                  aria-label={t("import_target_new_name")}
                />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setRows([])} disabled={busy !== null}>
                  {t("action_clear")}
                </Button>
                <Button onClick={startImport} disabled={importCount === 0 || busy !== null}>
                  {busy === "import" && <Loader2 className="animate-spin" />}
                  {t("admin_shelf_scan_add", importCount)}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <MovieSearchPickerDialog
        open={pickerRef !== null}
        onOpenChange={(o) => !o && setPickerRef(null)}
        onSelect={(m) => {
          if (!pickerRef) return;
          void setFilm(pickerRef, { tmdbId: m.id, title: m.title, poster: m.poster_path, year: m.release_date?.slice(0, 4) || null });
          setPickerRef(null);
        }}
      />
    </div>
  );
}
