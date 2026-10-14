"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import {
  adminMatchBarcodeRows,
  adminRegisterBarcodeWithConflictTitle,
  type BulkBarcodeRowMatch,
} from "@/actions/admin";
import type { MovieSummaryDto } from "@/types/tmdb";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { MediaTypeEditieSelects } from "@/components/admin/media-type-editie-selects";
import { cn } from "@/lib/utils";
import { isSeries } from "@/lib/titles";
import { parseSeasons } from "@/lib/seasons";
import { normalizeKind } from "@/lib/import-mapping";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const MAX_ROWS = 200;
const SEARCH_OTHER = "__search_other__";

type ParsedRow = { barcode: string; title: string; year: string; type: string; editie: string; kind: "movie" | "tv" | null; seasonsText: string };

type ReviewRow = {
  match: BulkBarcodeRowMatch;
  title: string;
  options: MovieSummaryDto[];
  movie: MovieSummaryDto | null;
  type: string;
  editie: string;
  seasonsText: string;
  checked: boolean;
  done: boolean;
  error?: string;
};

/** "barcode;titel;jaar;type;editie" per line — ';', tab or ',' separated,
 * optional header line. Kept dependency-free on purpose: no quoting rules,
 * film titles with a comma need ';' or tab as separator. */
function parseLines(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = lines.map((line) => {
    const sep = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
    const [barcode = "", title = "", year = "", type = "", editie = "", kind = "", seasonsText = ""] = line.split(sep).map((c) => c.trim());
    return {
      barcode,
      title,
      year: /^\d{4}$/.test(year) ? year : "",
      type,
      editie,
      kind: normalizeKind(kind) ?? (seasonsText ? "tv" : null),
      seasonsText,
    };
  });
  if (rows.length > 0 && !/\d/.test(rows[0].barcode)) rows.shift();
  return rows;
}

function pickKnown(value: string, allowed: string[], fallback: string): string {
  return allowed.find((a) => a.toLowerCase() === value.toLowerCase()) ?? fallback;
}

export function BarcodeBulkImport({ mediaTypes, edities }: { mediaTypes: string[]; edities: string[] }) {
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [pickerRow, setPickerRow] = useState<number | null>(null);

  const parsed = parseLines(text);
  const defaultType = mediaTypes[0] ?? "DVD";
  const defaultEditie = edities[0] ?? "Normaal";
  const selectedCount = rows?.filter((r) => r.checked && !r.done && r.movie).length ?? 0;

  async function handleFile(file: File) {
    const content = await file.text();
    setText((prev) => (prev.trim() ? `${prev.trimEnd()}\n${content}` : content));
  }

  async function handleMatch() {
    if (parsed.length === 0) return;
    if (parsed.length > MAX_ROWS) {
      toast.error(t("admin_bulk_too_many", MAX_ROWS));
      return;
    }
    setIsMatching(true);
    try {
      const matches = await adminMatchBarcodeRows(parsed.map(({ barcode, title, year, kind }) => ({ barcode, title, year, kind })));
      setRows(
        matches.map((match, i) => {
          const movie = match.candidates[0] ?? null;
          return {
            match,
            title: parsed[i].title,
            options: match.candidates,
            movie,
            type: pickKnown(parsed[i].type, mediaTypes, defaultType),
            editie: pickKnown(parsed[i].editie, edities, defaultEditie),
            seasonsText: parsed[i].seasonsText,
            checked: match.known.length === 0 && !!movie && !!match.barcode,
            done: false,
          };
        }),
      );
    } catch {
      toast.error(t("admin_add_film_error_submit"));
    } finally {
      setIsMatching(false);
    }
  }

  function updateRow(index: number, patch: Partial<ReviewRow>) {
    setRows((prev) => prev && prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleRegister() {
    if (!rows) return;
    setIsRegistering(true);
    let success = 0;
    let failed = 0;
    // Sequential on purpose: Next dispatches client-side actions one at a
    // time anyway, and it keeps per-row errors in order.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.checked || row.done || !row.movie) continue;
      const result = await adminRegisterBarcodeWithConflictTitle(
        row.movie.id,
        row.match.barcode,
        row.type,
        row.editie,
        isSeries(row.movie.id) ? parseSeasons(row.seasonsText) : null,
      );
      if (result.error === null) {
        success++;
        updateRow(i, { done: true, checked: false, error: undefined });
      } else {
        failed++;
        updateRow(i, {
          error:
            result.error === "duplicate"
              ? t("admin_add_film_error_duplicate", result.conflictTitle)
              : t("admin_add_film_error_submit"),
        });
      }
    }
    setIsRegistering(false);
    if (failed === 0) toast.success(t("admin_add_film_batch_success", success));
    else toast.warning(t("admin_add_film_batch_partial", success, failed));
  }

  if (!rows) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("admin_bulk_description")}</p>
        <Textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"8712609651234;The Matrix;1999;Blu-ray;Normaal\n5051888012345;Inception;2010\n5051888250005;Game of Thrones;2011;Blu-ray;Normaal;serie;1-3"}
          className="font-mono text-xs"
        />
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" />
            {t("admin_bulk_upload_button")}
          </Button>
          <Button disabled={parsed.length === 0 || isMatching} onClick={handleMatch}>
            {isMatching ? "…" : t("admin_bulk_match_button", parsed.length)}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => {
          const isKnown = row.match.known.length > 0;
          const status = row.done
            ? { label: t("admin_bulk_status_done"), tone: "text-success" }
            : isKnown
              ? { label: t("admin_bulk_status_known", row.match.known[0].title), tone: "text-muted-foreground" }
              : !row.movie
                ? { label: t("admin_bulk_status_no_match"), tone: "text-destructive" }
                : { label: t("admin_bulk_status_new"), tone: "text-foreground" };
          return (
            <div
              key={index}
              className={cn("flex flex-col gap-2 rounded-lg border border-border p-3", row.done && "opacity-60")}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={row.checked}
                  disabled={row.done || !row.movie || !row.match.barcode}
                  onCheckedChange={(v) => updateRow(index, { checked: v === true })}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm">{row.match.barcode || "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.title}
                    {row.movie && isSeries(row.movie.id) && (
                      <Badge variant="outline" className="ml-2 align-middle">
                        {t("picker_kind_series")}
                      </Badge>
                    )}
                  </p>
                  <p className={cn("text-xs", status.tone)}>{status.label}</p>
                  {!row.match.validChecksum && row.match.barcode && (
                    <p className="text-xs text-warning">{t("admin_bulk_status_invalid")}</p>
                  )}
                  {row.error && <p className="text-xs text-destructive">{row.error}</p>}
                </div>
              </div>
              {!row.done && (
                <>
                  <Select
                    value={row.movie ? String(row.movie.id) : undefined}
                    onValueChange={(v) => {
                      if (v === SEARCH_OTHER) {
                        setPickerRow(index);
                        return;
                      }
                      const movie = row.options.find((m) => String(m.id) === v) ?? null;
                      updateRow(index, { movie, checked: !!movie && !isKnown });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin_bulk_search_other")} />
                    </SelectTrigger>
                    <SelectContent>
                      {row.options.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.title}
                          {m.release_date ? ` (${m.release_date.slice(0, 4)})` : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value={SEARCH_OTHER}>{t("admin_bulk_search_other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {row.movie && isSeries(row.movie.id) && (
                    <Input
                      value={row.seasonsText}
                      onChange={(e) => updateRow(index, { seasonsText: e.target.value })}
                      placeholder={t("import_seasons_placeholder")}
                      aria-label={t("import_field_seasons")}
                      className="text-xs"
                    />
                  )}
                  <MediaTypeEditieSelects
                    mediaTypes={mediaTypes}
                    edities={edities}
                    type={row.type}
                    editie={row.editie}
                    onTypeChange={(v) => updateRow(index, { type: v })}
                    onEditieChange={(v) => updateRow(index, { editie: v })}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={selectedCount === 0 || isRegistering} onClick={handleRegister}>
          {t("admin_bulk_register_button", selectedCount)}
        </Button>
        <Button
          variant="outline"
          disabled={isRegistering}
          onClick={() => {
            setRows(null);
            setText("");
          }}
        >
          {t("admin_bulk_reset")}
        </Button>
      </div>

      <MovieSearchPickerDialog
        open={pickerRow !== null}
        onOpenChange={(open) => !open && setPickerRow(null)}
        onSelect={(movie) => {
          if (pickerRow === null) return;
          const row = rows[pickerRow];
          const options = row.options.some((m) => m.id === movie.id) ? row.options : [movie, ...row.options];
          updateRow(pickerRow, { movie, options, checked: row.match.known.length === 0 });
          setPickerRow(null);
        }}
      />
    </div>
  );
}
