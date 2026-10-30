"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Check, Layers } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { addManyToWishlist } from "@/actions/wishlist";
import type { Franchise, FranchisePart } from "@/actions/franchises";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Poster } from "@/components/movie/poster";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Filter = "incomplete" | "complete" | "all";

/** "Reeksen": per film series how many parts you own, the missing ones
 * greyed out, and one click to put them on your wishlist. */
export function FranchisesClient({ franchises }: { franchises: Franchise[] }) {
  const { t } = useT();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("incomplete");
  const [busy, setBusy] = useState<number | null>(null);
  // Optimistic: parts just added to the wishlist.
  const [wishedNow, setWishedNow] = useState<Set<number>>(new Set());

  const complete = (f: Franchise) => f.owned === f.parts.length;
  const shown = franchises.filter((f) => (filter === "all" ? true : filter === "complete" ? complete(f) : !complete(f)));
  const counts = { incomplete: franchises.filter((f) => !complete(f)).length, complete: franchises.filter(complete).length, all: franchises.length };

  async function wish(f: Franchise, parts: FranchisePart[]) {
    setBusy(f.id);
    try {
      const added = await addManyToWishlist(parts.map((p) => ({ tmdbMovieId: p.id, title: p.title, poster: p.poster })));
      setWishedNow((prev) => new Set([...prev, ...parts.map((p) => p.id)]));
      toast.success(added === 1 && parts.length === 1 ? t("franchise_wished_one", parts[0].title) : t("franchise_wished", added));
      router.refresh();
    } catch {
      toast.error(t("franchise_error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("franchise_title")} description={t("franchise_description")} />

      {franchises.length === 0 ? (
        <EmptyState icon={Layers} title={t("franchise_empty_title")} description={t("franchise_empty_description")} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="tablist">
            {(["incomplete", "complete", "all"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={filter === k}
                onClick={() => setFilter(k)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === k ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`franchise_filter_${k}`)} ({counts[k]})
              </button>
            ))}
          </div>

          {shown.length === 0 && <p className="text-sm text-muted-foreground">{t("franchise_filter_empty")}</p>}

          <ul className="flex min-w-0 flex-col gap-4">
            {shown.map((f) => {
              const missing = f.parts.filter((p) => !p.owned && !p.wished && !wishedNow.has(p.id));
              return (
                <li key={f.id} id={`reeks-${f.id}`} className="min-w-0 scroll-mt-24 rounded-card border border-border/70 bg-card/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <h2 className="font-display text-xl font-semibold tracking-tight">{f.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {complete(f) ? t("franchise_complete") : t("franchise_owned_of", f.owned, f.parts.length)}
                      </p>
                      <Progress value={f.owned} max={f.parts.length} className="w-48" label={t("franchise_owned_of", f.owned, f.parts.length)} />
                    </div>
                    {missing.length > 0 && (
                      <Button size="sm" variant="secondary" disabled={busy === f.id} onClick={() => wish(f, missing)}>
                        <Bookmark />
                        {missing.length === 1 ? t("franchise_wish_missing_one") : t("franchise_wish_missing", missing.length)}
                      </Button>
                    )}
                  </div>
                  <div className="mt-4 flex max-w-full gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {f.parts.map((p) => {
                      const wished = p.wished || wishedNow.has(p.id);
                      return (
                        <div key={p.id} className="flex w-24 shrink-0 flex-col gap-1.5">
                          <Link href={`/films/${p.id}`} className="group relative block">
                            <Poster path={p.poster} title={p.title} size="sm" hover className={cn(!p.owned && "opacity-40 grayscale")} />
                            {p.owned && (
                              <span className="absolute right-1.5 top-1.5 rounded-full bg-success p-0.5 text-white shadow" aria-label={t("franchise_part_owned")}>
                                <Check className="size-3" />
                              </span>
                            )}
                            {!p.owned && wished && (
                              <span className="absolute right-1.5 top-1.5 rounded-full bg-primary p-0.5 text-primary-foreground shadow" aria-label={t("franchise_part_wished")}>
                                <BookmarkCheck className="size-3" />
                              </span>
                            )}
                          </Link>
                          <p className="line-clamp-2 text-xs leading-snug">
                            {p.title}
                            {p.year && <span className="text-muted-foreground"> ({p.year})</span>}
                          </p>
                          {!p.owned && !wished && (
                            <button
                              type="button"
                              disabled={busy === f.id}
                              onClick={() => wish(f, [p])}
                              className="w-fit text-xs font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
                            >
                              {t("franchise_wish_one")}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
