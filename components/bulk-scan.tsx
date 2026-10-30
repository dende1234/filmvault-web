"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Camera, CheckCircle2, CircleHelp, Film, Loader2, Package, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { useHasCamera } from "@/lib/use-has-camera";
import { normalizeBarcode } from "@/lib/barcode";
import { addExistingBarcodesToCollections, addKnownBoxToCollections, lookupScannedBarcode, type ScannedBarcodeResult } from "@/actions/barcodes";
import { removeFromWishlistIfCovered } from "@/actions/wishlist";
import type { Collection } from "@/types/database";
import { cn } from "@/lib/utils";
import { ScannerView } from "@/components/barcode-scanner";
import { PageHeader } from "@/components/page-header";
import { Poster } from "@/components/movie/poster";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MovieMultiSelectPickerDialog, MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { AddToCollectionDialog } from "@/components/add-to-collection-dialog";
import { BoxDetailsDialog, type BoxDraft } from "@/components/box-details-dialog";

type Kind = "loading" | "new" | "other" | "owned" | "box_new" | "box_owned" | "unknown" | "error";
type Entry = {
  code: string;
  kind: Kind;
  result?: ScannedBarcodeResult;
  include: boolean;
  done?: "added" | "already" | "failed";
};

const KIND: Record<Kind, { icon: typeof Film; label: keyof Dictionary; tone: string }> = {
  loading: { icon: Loader2, label: "bulk_scan_kind_loading", tone: "text-muted-foreground" },
  new: { icon: Sparkles, label: "bulk_scan_kind_new", tone: "text-primary" },
  other: { icon: AlertTriangle, label: "bulk_scan_kind_other", tone: "text-warning" },
  owned: { icon: CheckCircle2, label: "bulk_scan_kind_owned", tone: "text-success" },
  box_new: { icon: Package, label: "bulk_scan_kind_box_new", tone: "text-primary" },
  box_owned: { icon: CheckCircle2, label: "bulk_scan_kind_box_owned", tone: "text-success" },
  unknown: { icon: CircleHelp, label: "bulk_scan_kind_unknown", tone: "text-muted-foreground" },
  error: { icon: AlertTriangle, label: "bulk_scan_kind_error", tone: "text-destructive" },
};

function kindOf(r: ScannedBarcodeResult): Kind {
  if (r.kind === "none") return "unknown";
  if (r.kind === "box") return r.owned.length > 0 ? "box_owned" : "box_new";
  return r.owned.length > 0 ? "owned" : r.otherEditions.length > 0 ? "other" : "new";
}

/** "Meerdere scannen": scan a pile of discs in a row (camera, or a USB scanner
 * that types into the field), see per disc whether it's new, another edition,
 * already owned, a box or unknown, and add all known ones to one collection
 * at once. Already-owned discs are unticked by default; unknown barcodes go
 * through the usual "film or box" flow one by one. */
export function BulkScan({ collections, initialCollectionId }: { collections: Collection[]; initialCollectionId: string | null }) {
  const { t } = useT();
  const router = useRouter();
  const hasCamera = useHasCamera();
  const [cameraOn, setCameraOn] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [typed, setTyped] = useState("");
  const [target, setTarget] = useState<string | null>(initialCollectionId);
  const [adding, setAdding] = useState(false);
  // Unknown barcode being handled through the regular flows.
  const [unknown, setUnknown] = useState<{ code: string; as: "film" | "box" } | null>(null);
  const [picked, setPicked] = useState<{ id: number; title: string; poster: string | null; code: string } | null>(null);
  const [boxDraft, setBoxDraft] = useState<BoxDraft | null>(null);

  const update = (code: string, patch: Partial<Entry>) => setEntries((prev) => prev.map((e) => (e.code === code ? { ...e, ...patch } : e)));

  async function addCode(raw: string) {
    const code = normalizeBarcode(raw);
    if (!code) return;
    if (entries.some((e) => e.code === code)) {
      toast(t("bulk_scan_duplicate", code));
      return;
    }
    setEntries((prev) => [{ code, kind: "loading", include: false }, ...prev]);
    try {
      const result = await lookupScannedBarcode(code);
      const kind = kindOf(result);
      update(code, { result, kind, include: kind === "new" || kind === "other" || kind === "box_new" });
    } catch {
      update(code, { kind: "error" });
    }
  }

  const toAdd = entries.filter((e) => e.include && !e.done && e.result && e.result.kind !== "none");

  async function addAll() {
    if (!target || toAdd.length === 0) return;
    setAdding(true);
    let added = 0;
    for (const e of toAdd) {
      const r = e.result!;
      try {
        const already: Set<string> =
          r.kind === "box"
            ? r.boxGroupId
              ? await addKnownBoxToCollections(r.films, r.boxGroupId, r.boxName, r.barcode, r.type, r.editie, [target])
              : new Set<string>([target])
            : r.kind === "title"
              ? await addExistingBarcodesToCollections([r.barcodeRow], r.title.id, r.title.title, r.title.poster, [target])
              : new Set<string>();
        const isAlready = already.has(target);
        update(e.code, { done: isAlready ? "already" : "added", include: false });
        if (!isAlready) {
          added++;
          const ids = r.kind === "box" ? r.films.map((f) => f.tmdb_movie_id) : r.kind === "title" ? [r.title.id] : [];
          for (const id of ids) await removeFromWishlistIfCovered(id).catch(() => {});
        }
      } catch {
        update(e.code, { done: "failed" });
      }
    }
    setAdding(false);
    toast.success(t("bulk_scan_added", added));
    router.refresh();
  }

  const targetName = collections.find((c) => c.id === target)?.name ?? "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("bulk_scan_title")} description={t("bulk_scan_description")} />

      <div className="flex flex-col gap-3 rounded-card border border-border/70 bg-card/70 p-4">
        {hasCamera &&
          (cameraOn ? (
            <div className="flex flex-col gap-2">
              <ScannerView continuous onDetected={addCode} />
              <Button variant="ghost" size="sm" className="w-fit" onClick={() => setCameraOn(false)}>
                {t("bulk_scan_camera_off")}
              </Button>
            </div>
          ) : (
            <Button className="w-fit" onClick={() => setCameraOn(true)}>
              <Camera />
              {t("bulk_scan_camera_on")}
            </Button>
          ))}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addCode(typed);
            setTyped("");
          }}
        >
          <Label htmlFor="bulk-code" className="sr-only">
            {t("bulk_scan_type_label")}
          </Label>
          <Input
            id="bulk-code"
            inputMode="numeric"
            autoComplete="off"
            placeholder={t("bulk_scan_type_label")}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={!typed.trim()}>
            {t("action_add")}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">{t(hasCamera ? "bulk_scan_hint" : "bulk_scan_hint_no_camera")}</p>
      </div>

      {entries.length > 0 && (
        <ul className="flex flex-col gap-2">
          {entries.map((e) => {
            const k = KIND[e.kind];
            const Icon = k.icon;
            const r = e.result;
            const name = r?.kind === "title" ? r.title.title : r?.kind === "box" ? (r.boxName ?? r.films[0]?.movie_title) : null;
            const poster = r?.kind === "title" ? r.title.poster : r?.kind === "box" ? (r.films[0]?.movie_poster ?? null) : null;
            const selectable = !!r && r.kind !== "none" && !e.done;
            return (
              <li key={e.code} className={cn("flex items-center gap-3 rounded-lg border border-border bg-card/60 p-2.5", e.done === "added" && "opacity-70")}>
                {selectable ? (
                  <Checkbox
                    checked={e.include}
                    onCheckedChange={(v) => update(e.code, { include: v === true })}
                    aria-label={t("bulk_scan_include", name ?? e.code)}
                  />
                ) : (
                  <span className="size-4 shrink-0" aria-hidden />
                )}
                <div className="w-10 shrink-0">
                  {name ? <Poster path={poster} title={name} size="xs" /> : <div className="aspect-[2/3] rounded bg-elevated" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-sm font-medium">{name ?? e.code}</p>
                  <p className={cn("flex items-center gap-1 text-xs", k.tone)}>
                    <Icon className={cn("size-3.5 shrink-0", e.kind === "loading" && "animate-spin")} aria-hidden />
                    {e.done ? t(e.done === "added" ? "bulk_scan_done_added" : e.done === "already" ? "bulk_scan_done_already" : "bulk_scan_done_failed") : t(k.label)}
                    {name && <span className="font-mono text-muted-foreground"> · {e.code}</span>}
                  </p>
                </div>
                {e.kind === "unknown" && (
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setUnknown({ code: e.code, as: "film" })}>
                      {t("bulk_scan_unknown_film")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setUnknown({ code: e.code, as: "box" })}>
                      {t("bulk_scan_unknown_box")}
                    </Button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setEntries((prev) => prev.filter((x) => x.code !== e.code))}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-elevated hover:text-foreground"
                  aria-label={t("bulk_scan_remove", name ?? e.code)}
                >
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {entries.length > 0 && (
        <div className="sticky bottom-20 flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-xl shadow-black/30 sm:flex-row sm:items-end md:bottom-4">
          {collections.length === 0 ? (
            <p className="flex-1 text-sm text-muted-foreground">
              {t("scan_result_no_collections")}{" "}
              <Link href="/collections" className="font-medium text-primary hover:underline">
                {t("scan_result_create_collection")}
              </Link>
            </p>
          ) : (
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="bulk-target">{t("scan_result_collections_new")}</Label>
              <Select value={target ?? undefined} onValueChange={setTarget}>
                <SelectTrigger id="bulk-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            {target && entries.some((e) => e.done === "added") && (
              <Button asChild variant="ghost">
                <Link href={`/collections/${target}`}>{t("bulk_scan_go", targetName)}</Link>
              </Button>
            )}
            <Button onClick={addAll} disabled={adding || !target || toAdd.length === 0}>
              {adding ? t("bulk_scan_adding") : t("bulk_scan_add_all", toAdd.length)}
            </Button>
          </div>
        </div>
      )}

      {/* Unknown barcodes: the usual flows, with the barcode filled in. */}
      <MovieSearchPickerDialog
        open={unknown?.as === "film"}
        onOpenChange={(o) => !o && setUnknown(null)}
        onSelect={(m) => {
          if (unknown) setPicked({ id: m.id, title: m.title, poster: m.poster_path, code: unknown.code });
          setUnknown(null);
        }}
      />
      <MovieMultiSelectPickerDialog
        open={unknown?.as === "box"}
        onOpenChange={(o) => !o && setUnknown(null)}
        onConfirm={(movies) => {
          if (unknown) setBoxDraft({ films: movies.map((m) => ({ tmdb_movie_id: m.id, movie_title: m.title, movie_poster: m.poster_path })), barcode: unknown.code });
          setUnknown(null);
        }}
      />
      {picked && (
        <AddToCollectionDialog
          open
          onOpenChange={(o) => !o && setPicked(null)}
          tmdbMovieId={picked.id}
          movieTitle={picked.title}
          moviePoster={picked.poster}
          initialBarcode={picked.code}
        />
      )}
      {boxDraft && <BoxDetailsDialog key={boxDraft.barcode} draft={boxDraft} onClose={() => setBoxDraft(null)} />}
    </div>
  );
}
