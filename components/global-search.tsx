"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Crown, Eye, Film, Loader2, Package, Search } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { titleHref } from "@/lib/titles";
import { searchMine, type SearchHit } from "@/actions/search";
import { Poster } from "@/components/movie/poster";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

function hrefOf(h: SearchHit) {
  if (h.kind !== "copy") return titleHref(h.tmdbId);
  if (h.isBox && h.boxGroupId) return `/collections/${h.collectionId}/boxes/${h.boxGroupId}`;
  return `/collections/${h.collectionId}/items/${h.id}`;
}

/** Search across your collections, wishlist and watched log. Opens with
 * "/" (or Ctrl/⌘+K) anywhere outside a text field, or the menu button. */
export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const mine = ++seq.current;
    const timer = setTimeout(() => {
      setLoading(true);
      searchMine(term)
        .then((r) => {
          if (seq.current === mine) {
            setHits(r);
            setActive(0);
          }
        })
        .catch(() => seq.current === mine && setHits([]))
        .finally(() => seq.current === mine && setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  const shown = q.trim().length >= 2 ? hits : [];

  function go(href: string) {
    onOpenChange(false);
    setQ("");
    setHits([]);
    router.push(href);
  }

  const label = (h: SearchHit) =>
    h.kind === "copy"
      ? [h.collectionName, h.type, h.editie !== "Normaal" ? h.editie : null].filter(Boolean).join(" · ")
      : h.kind === "wish"
        ? t("search_on_wishlist")
        : t("search_watched");
  const Icon = (h: SearchHit) => (h.kind === "copy" ? (h.isBox ? Package : Film) : h.kind === "wish" ? (h.grail ? Crown : Bookmark) : Eye);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] translate-y-0 gap-0 p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">{t("search_title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("search_hint")}</DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, shown.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (shown[active]) go(hrefOf(shown[active]));
                else if (q.trim()) go(`/films?query=${encodeURIComponent(q.trim())}`);
              }
            }}
            placeholder={t("search_placeholder")}
            aria-label={t("search_title")}
            role="combobox"
            aria-expanded={shown.length > 0}
            aria-controls="global-search-results"
            aria-activedescendant={shown[active] ? `gs-${active}` : undefined}
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
        </div>
        <ul id="global-search-results" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {shown.map((h, i) => {
            const I = Icon(h);
            return (
              <li key={`${h.kind}-${h.kind === "copy" ? h.id : h.tmdbId}`} id={`gs-${i}`} role="option" aria-selected={i === active}>
                <Link
                  href={hrefOf(h)}
                  onClick={(e) => {
                    e.preventDefault();
                    go(hrefOf(h));
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${i === active ? "bg-elevated" : ""}`}
                >
                  <Poster path={h.poster} title={h.title} size="xs" className="w-8 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{h.kind === "copy" && h.isBox ? (h.boxName ?? h.title) : h.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{label(h)}</span>
                  </span>
                  <I className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
          {q.trim().length >= 2 && !loading && shown.length === 0 && <li className="px-2 py-3 text-sm text-muted-foreground">{t("search_none")}</li>}
          {q.trim().length >= 2 && (
            <li>
              <Link
                href={`/films?query=${encodeURIComponent(q.trim())}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(`/films?query=${encodeURIComponent(q.trim())}`);
                }}
                className="mt-1 flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-primary hover:bg-elevated"
              >
                <Search className="size-4" aria-hidden />
                {t("search_all_films", q.trim())}
              </Link>
            </li>
          )}
          {q.trim().length < 2 && <li className="px-2 py-3 text-sm text-muted-foreground">{t("search_hint")}</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
