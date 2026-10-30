"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Package, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { getUserCollections, setCopyCollections } from "@/actions/collections";
import { addExistingBarcodesToCollections, addKnownBoxToCollections, type OwnedCopy, type ScannedBarcodeResult } from "@/actions/barcodes";
import { removeFromWishlistIfCovered } from "@/actions/wishlist";
import type { Collection } from "@/types/database";
import { cn } from "@/lib/utils";
import { Poster } from "@/components/movie/poster";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Known = Extract<ScannedBarcodeResult, { kind: "title" | "box" }>;

function release(type: string, editie: string, cut?: string | null, label?: string | null, region?: string | null) {
  const regionText = region ? (region === "Regiovrij" ? "Regiovrij" : `Regio ${region}`) : null;
  return [type, editie !== "Normaal" ? editie : null, cut, label, regionText].filter(Boolean).join(" · ");
}

/** A known barcode (film, series or box) in one screen: what it means for
 * you (you own this release / you own the title in another edition / new),
 * the title, and the collections to put it in. No barcode, format or edition
 * fields: the master list already knows those. If you own this very release,
 * the collections are those of that copy (ticking more keeps it one copy);
 * "Ik heb er nog een" adds a second physical copy instead. */
export function ScanResultDialog({ result, onClose }: { result: Known; onClose: () => void }) {
  const { t } = useT();
  const router = useRouter();
  const isBox = result.kind === "box";
  const owned = result.owned;
  const other = result.kind === "title" ? result.otherEditions : [];
  const status: "owned" | "other" | "new" = owned.length > 0 ? "owned" : other.length > 0 ? "other" : "new";
  const ownedCopy: OwnedCopy | null = owned[0] ?? null;

  const [collections, setCollections] = useState<Collection[] | null>(null);
  // "copy" = this owned copy's collections; "new" = a (second) physical copy.
  const [mode, setMode] = useState<"copy" | "new">(ownedCopy ? "copy" : "new");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(ownedCopy?.collectionIds ?? []));
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    getUserCollections()
      .then((cols) => {
        setCollections(cols);
        if (!ownedCopy && cols.length === 1) setSelected(new Set([cols[0].id]));
      })
      .catch(() => setCollections([]));
  }, [ownedCopy]);

  const name = isBox ? (result.boxName ?? result.films[0]?.movie_title ?? "") : result.title.title;
  const poster = isBox ? (result.films[0]?.movie_poster ?? null) : result.title.poster;
  const scanned = isBox ? release(result.type, result.editie) : release(result.release.type, result.release.editie);

  const banner = {
    owned: {
      icon: CheckCircle2,
      title: t(isBox ? "scan_result_box_owned_title" : "scan_result_owned_title"),
      hint: t("scan_result_owned_hint"),
      tone: "border-success/40 bg-success/10 text-success",
    },
    other: {
      icon: AlertTriangle,
      title: t("scan_result_other_title"),
      hint: t("scan_result_other_hint"),
      tone: "border-warning/40 bg-warning/10 text-warning",
    },
    new: {
      icon: Sparkles,
      title: t("scan_result_new_title"),
      hint: t("scan_result_new_hint"),
      tone: "border-primary/40 bg-primary/10 text-primary",
    },
  }[status];
  const Icon = banner.icon;

  const copyHref = (c: OwnedCopy) =>
    isBox && result.boxGroupId ? `/collections/${c.collectionId}/boxes/${result.boxGroupId}` : `/collections/${c.collectionId}/items/${c.itemId}`;
  const list = status === "owned" ? owned : other;

  const unchanged =
    mode === "copy" &&
    ownedCopy !== null &&
    selected.size === ownedCopy.collectionIds.length &&
    ownedCopy.collectionIds.every((id) => selected.has(id));

  function toggle(id: string, on: boolean) {
    setInfo(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function startNewCopy() {
    setMode("new");
    setInfo(null);
    setSelected(new Set(collections?.length === 1 ? [collections[0].id] : []));
  }

  async function save() {
    if (selected.size === 0) return;
    setSaving(true);
    setInfo(null);
    const ids = Array.from(selected);
    try {
      if (mode === "copy" && ownedCopy) {
        const res = await setCopyCollections(ownedCopy.itemId, ids);
        if (res.error) throw new Error(res.error);
        toast.success(t("copy_collections_saved"));
      } else {
        const already =
          result.kind === "box"
            ? result.boxGroupId
              ? await addKnownBoxToCollections(result.films, result.boxGroupId, result.boxName, result.barcode, result.type, result.editie, ids)
              : new Set<string>()
            : await addExistingBarcodesToCollections([result.barcodeRow], result.title.id, result.title.title, result.title.poster, ids);
        const names = (collections ?? []).filter((c) => already.has(c.id)).map((c) => c.name).join(", ");
        if (already.size === ids.length) {
          setInfo(t("add_to_collection_already_in", names));
          return;
        }
        if (already.size > 0) toast(t("add_to_collection_already_in_partial", names));
        else toast.success(t("scan_result_added"));
        if (result.kind === "title") await removeFromWishlistIfCovered(result.title.id).catch(() => {});
        else for (const f of result.films) await removeFromWishlistIfCovered(f.tmdb_movie_id).catch(() => {});
      }
      onClose();
      router.refresh();
    } catch {
      toast.error(t("add_to_collection_error_submit"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* No auto-focus on "Annuleren": the result is what you look at first. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="sr-only">{banner.title}</DialogTitle>
          <DialogDescription className="sr-only">{banner.hint}</DialogDescription>
        </DialogHeader>

        <div className={cn("flex items-start gap-3 rounded-lg border p-4", banner.tone)} role="status">
          <Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
          <div className="flex flex-col gap-0.5">
            <p className="font-display text-lg font-semibold leading-tight tracking-tight text-foreground">{banner.title}</p>
            <p className="text-sm text-muted-foreground">{banner.hint}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Poster path={poster} title={name} size="sm" className="w-16 shrink-0" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="flex items-center gap-1.5 font-medium leading-snug">
              {isBox && <Package className="size-4 shrink-0 text-primary" aria-hidden />}
              <span className="line-clamp-2">{name}</span>
            </p>
            <p className="text-sm text-muted-foreground">{t("scan_result_scanned", scanned)}</p>
            {isBox && (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {t("box_card_film_count", result.films.length)}: {result.films.map((f) => f.movie_title).join(", ")}
              </p>
            )}
          </div>
        </div>

        {list.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t("scan_result_your_copies")}</p>
            <ul className="flex flex-col gap-2">
              {list.map((c) => (
                <li key={c.itemId} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-elevated/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{release(c.type, c.editie, c.cut, c.label, c.region)}</p>
                    <p className="truncate text-xs text-muted-foreground">{t("scan_result_in", c.collections.join(", "))}</p>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="shrink-0">
                    <Link href={copyHref(c)} onClick={onClose}>
                      {t("scan_result_view")}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {t(mode === "copy" ? "scan_result_collections_copy" : "scan_result_collections_new")}
          </p>
          {collections === null ? (
            <p className="text-sm text-muted-foreground">{t("scan_box_loading")}</p>
          ) : collections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("scan_result_no_collections")}{" "}
              <Link href="/collections" onClick={onClose} className="font-medium text-primary hover:underline">
                {t("scan_result_create_collection")}
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {collections.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={selected.has(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} />
                    {c.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {mode === "copy" && (
            <button type="button" onClick={startNewCopy} className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              {t("scan_result_second_copy")}
            </button>
          )}
          {info && <p className="text-sm text-muted-foreground">{info}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("action_cancel")}
          </Button>
          <Button onClick={save} disabled={saving || selected.size === 0 || unchanged}>
            {t(mode === "copy" ? "action_save" : "scan_result_add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
