"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bookmark, Camera, CheckCircle2, CircleHelp, Crown, Loader2, Package, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { useHasCamera } from "@/lib/use-has-camera";
import { normalizeBarcode } from "@/lib/barcode";
import { getOwnedCopiesOfTitle, lookupScannedBarcode, type OwnedCopy, type ScannedBarcodeResult } from "@/actions/collections";
import { addToWishlist, getWishlistStatus } from "@/actions/wishlist";
import { suggestTitlesForBarcode, type BarcodeSuggestion } from "@/actions/barcode-suggest";
import { cn } from "@/lib/utils";
import { ScannerView } from "@/components/barcode-scanner";
import { PageHeader } from "@/components/page-header";
import { Poster } from "@/components/movie/poster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";
import { ScanResultDialog } from "@/components/scan-result-dialog";

type Status = "owned" | "other" | "wish" | "grail" | "new" | "unknown";
type Known = Extract<ScannedBarcodeResult, { kind: "title" | "box" }>;
export type Check = {
  key: number;
  label: string; // barcode or searched title
  status: Status | "loading" | "error";
  name?: string;
  poster?: string | null;
  isBox?: boolean;
  /** tmdb ids involved (one title, or a box's films). */
  ids?: number[];
  copies?: OwnedCopy[];
  /** Also on the wishlist (e.g. you own another edition and want this one). */
  alsoWished?: boolean;
  result?: Known;
  /** Unknown barcode: what an external barcode database suggests. */
  suggestions?: BarcodeSuggestion[];
};

const STATUS: Record<Status, { icon: typeof CheckCircle2; title: keyof Dictionary; hint: keyof Dictionary; tone: string; text: string; vibrate: number[] }> = {
  owned: { text: "text-success", icon: CheckCircle2, title: "shop_status_owned", hint: "shop_status_owned_hint", tone: "border-success/50 bg-success/10 text-success", vibrate: [200] },
  other: { text: "text-warning", icon: AlertTriangle, title: "shop_status_other", hint: "shop_status_other_hint", tone: "border-warning/50 bg-warning/10 text-warning", vibrate: [80, 60, 80] },
  grail: { text: "text-primary", icon: Crown, title: "shop_status_grail", hint: "shop_status_grail_hint", tone: "border-primary bg-primary/20 text-primary", vibrate: [60, 40, 60, 40, 200] },
  wish: { text: "text-primary", icon: Bookmark, title: "shop_status_wish", hint: "shop_status_wish_hint", tone: "border-primary/60 bg-primary/15 text-primary", vibrate: [60, 40, 60, 40, 60] },
  new: { text: "text-sky-600 dark:text-sky-400", icon: Sparkles, title: "shop_status_new", hint: "shop_status_new_hint", tone: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400", vibrate: [40] },
  unknown: { text: "text-muted-foreground", icon: CircleHelp, title: "shop_status_unknown", hint: "shop_status_unknown_hint", tone: "border-border bg-muted text-muted-foreground", vibrate: [40] },
};

function statusOf(owned: number, other: number, wish: { grail: boolean } | undefined): Status {
  if (owned > 0) return "owned";
  if (other > 0) return "other";
  if (wish) return wish.grail ? "grail" : "wish";
  return "new";
}

function release(c: OwnedCopy) {
  return [c.type, c.editie !== "Normaal" ? c.editie : null, c.cut, c.label].filter(Boolean).join(" · ");
}

/** Winkelmodus: scan (or search) in a shop and see at once whether you own
 * it, own another edition, want it (wishlist / Holy Grail) or it's new.
 * Keeps the screen awake and vibrates per status where the device can. */
export function ShopMode() {
  const { t } = useT();
  const hasCamera = useHasCamera();
  const [cameraOn, setCameraOn] = useState(false);
  const [checks, setChecks] = useState<Check[]>([]);
  const [typed, setTyped] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [adding, setAdding] = useState<Known | null>(null);
  const nextKey = useRef(1);

  // Keep the screen on while shopping; re-acquire when the tab comes back.
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<Sentinel> } };
    let lock: Sentinel | null = null;
    const acquire = () => {
      if (document.visibilityState !== "visible" || !nav.wakeLock) return;
      nav.wakeLock
        .request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, []);

  function begin(label: string): number {
    const key = nextKey.current++;
    const pending: Check = { key, label, status: "loading" };
    setChecks((prev) => [pending, ...prev].slice(0, 30));
    return key;
  }

  function finish(key: number, patch: Partial<Check>) {
    setChecks((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
    if (patch.status && patch.status !== "loading" && patch.status !== "error") {
      try {
        navigator.vibrate?.(STATUS[patch.status].vibrate);
      } catch {}
    }
  }

  async function scan(raw: string) {
    const code = normalizeBarcode(raw);
    if (!code) return;
    const key = begin(code);
    try {
      const result = await lookupScannedBarcode(code);
      if (result.kind === "none") {
        finish(key, { status: "unknown" });
        suggestTitlesForBarcode(code)
          .then((r) => r.suggestions.length > 0 && setChecks((prev) => prev.map((c) => (c.key === key ? { ...c, suggestions: r.suggestions } : c))))
          .catch(() => {});
        return;
      }
      const ids = result.kind === "box" ? result.films.map((f) => f.tmdb_movie_id) : [result.title.id];
      const wishes = await getWishlistStatus(ids);
      const wish = ids.map((id) => wishes[id]).find(Boolean);
      const other = result.kind === "title" ? result.otherEditions : [];
      finish(key, {
        status: statusOf(result.owned.length, other.length, wish),
        name: result.kind === "box" ? (result.boxName ?? result.films[0]?.movie_title) : result.title.title,
        poster: result.kind === "box" ? (result.films[0]?.movie_poster ?? null) : result.title.poster,
        isBox: result.kind === "box",
        ids,
        copies: result.owned.length > 0 ? result.owned : other,
        alsoWished: !!wish && (result.owned.length > 0 || other.length > 0),
        result,
      });
    } catch {
      finish(key, { status: "error" });
    }
  }

  async function checkTitle(title: { id: number; title: string; poster_path: string | null }) {
    const key = begin(title.title);
    try {
      const [copies, wishes] = await Promise.all([getOwnedCopiesOfTitle(title.id), getWishlistStatus([title.id])]);
      // Without a barcode the edition is unknown: any copy counts as "owned".
      finish(key, {
        status: statusOf(copies.length, 0, wishes[title.id]),
        name: title.title,
        poster: title.poster_path,
        ids: [title.id],
        copies,
        alsoWished: !!wishes[title.id] && copies.length > 0,
      });
    } catch {
      finish(key, { status: "error" });
    }
  }

  async function wish(c: Check) {
    if (!c.ids?.[0] || !c.name) return;
    try {
      await addToWishlist(c.ids[0], c.name, c.poster ?? null);
      setChecks((prev) => prev.map((x) => (x.key === c.key ? { ...x, status: "wish" } : x)));
      toast.success(t("shop_wished", c.name));
    } catch {
      toast.error(t("shop_error"));
    }
  }

  const [current, ...history] = checks;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("shop_title")} description={t("shop_description")} />

      <div className="flex flex-col gap-3 rounded-card border border-border/70 bg-card/70 p-4">
        {hasCamera &&
          (cameraOn ? (
            <div className="flex flex-col gap-2">
              <ScannerView continuous onDetected={scan} />
              <Button variant="ghost" size="sm" className="w-fit" onClick={() => setCameraOn(false)}>
                {t("bulk_scan_camera_off")}
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={() => setCameraOn(true)}>
              <Camera />
              {t("shop_camera_on")}
            </Button>
          ))}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            scan(typed);
            setTyped("");
          }}
        >
          <Label htmlFor="shop-code" className="sr-only">
            {t("bulk_scan_type_label")}
          </Label>
          <Input
            id="shop-code"
            inputMode="numeric"
            autoComplete="off"
            placeholder={t("bulk_scan_type_label")}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={!typed.trim()}>
            {t("shop_check")}
          </Button>
        </form>
        <Button variant="outline" className="w-fit" onClick={() => setSearchOpen(true)}>
          <Search />
          {t("shop_search_title")}
        </Button>
      </div>

      {current && (
        <ResultCard
          check={current}
          onWish={() => wish(current)}
          onAdd={() => current.result && setAdding(current.result)}
          onSearch={() => setSearchOpen(true)}
          onPick={(m) => checkTitle({ id: m.id, title: m.title, poster_path: m.poster })}
        />
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">{t("shop_history")}</h2>
          <ul className="flex flex-col gap-1.5">
            {history.map((c) => {
              const s = c.status === "loading" || c.status === "error" ? null : STATUS[c.status];
              const Icon = s?.icon ?? (c.status === "loading" ? Loader2 : AlertTriangle);
              return (
                <li key={c.key} className="flex items-center gap-3 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm">
                  <Icon className={cn("size-4 shrink-0", s?.text ?? "text-muted-foreground", c.status === "loading" && "animate-spin")} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{c.name ?? c.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{s ? t(s.title) : t(c.status === "loading" ? "bulk_scan_kind_loading" : "shop_error")}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <MovieSearchPickerDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={(m) => {
          setSearchOpen(false);
          checkTitle({ id: m.id, title: m.title, poster_path: m.poster_path });
        }}
      />
      {adding && <ScanResultDialog result={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}

export function ResultCard({
  check: c,
  onWish,
  onAdd,
  onSearch,
  onPick,
}: {
  check: Check;
  onWish: () => void;
  onAdd: () => void;
  onSearch: () => void;
  onPick?: (m: BarcodeSuggestion) => void;
}) {
  const { t } = useT();
  if (c.status === "loading")
    return (
      <div className="flex items-center gap-3 rounded-card border border-border bg-card p-5 text-muted-foreground" role="status">
        <Loader2 className="size-6 animate-spin" aria-hidden />
        {t("bulk_scan_kind_loading")} {c.label}
      </div>
    );
  if (c.status === "error")
    return (
      <div className="rounded-card border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive" role="alert">
        {t("shop_error")}
      </div>
    );
  const s = STATUS[c.status];
  const Icon = s.icon;
  return (
    <div className={cn("flex flex-col gap-4 rounded-card border-2 p-5", s.tone)} role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-8 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground">{t(s.title)}</p>
          <p className="text-sm text-muted-foreground">{t(s.hint)}</p>
        </div>
      </div>
      {c.name ? (
        <div className="flex items-center gap-4 text-foreground">
          <Poster path={c.poster ?? null} title={c.name} size="sm" className="w-16 shrink-0" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="flex items-center gap-1.5 font-medium leading-snug">
              {c.isBox && <Package className="size-4 shrink-0 text-primary" aria-hidden />}
              <span className="line-clamp-2">{c.name}</span>
            </p>
            {c.copies?.map((copy) => (
              <p key={copy.itemId} className="text-xs text-muted-foreground">
                {release(copy)} · {t("scan_result_in", copy.collections.join(", "))}
              </p>
            ))}
            {c.alsoWished && <p className="text-xs font-medium text-primary">{t("shop_also_wished")}</p>}
          </div>
        </div>
      ) : (
        <p className="font-mono text-sm text-foreground">{c.label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {c.result && (
          <Button size="sm" variant={c.status === "owned" ? "outline" : "default"} onClick={onAdd}>
            {t(c.status === "owned" ? "shop_add_again" : "shop_bought")}
          </Button>
        )}
        {c.status === "new" && c.name && (
          <Button size="sm" variant="secondary" onClick={onWish}>
            <Bookmark />
            {t("shop_wish")}
          </Button>
        )}
        {c.status === "unknown" &&
          c.suggestions?.map((m) => (
            <Button key={m.id} size="sm" onClick={() => onPick?.(m)}>
              {t("shop_suggest_pick", m.year ? `${m.title} (${m.year})` : m.title)}
            </Button>
          ))}
        {c.status === "unknown" && (
          <Button size="sm" variant="secondary" onClick={onSearch}>
            <Search />
            {t("shop_search_title")}
          </Button>
        )}
      </div>
    </div>
  );
}
