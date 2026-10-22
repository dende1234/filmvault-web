"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { editionLabel } from "@/lib/edition-label";
import { restoreRejectedBarcodes } from "@/actions/collections";
import type { PendingBarcodeCardItem } from "@/types/database";
import { posterUrl } from "@/types/tmdb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";

/** One line per submitter + barcode + title: the same thing submitted three
 * times (e.g. because nothing seemed to happen) is one card, and "restore"
 * brings back only the newest of them. */
type Group = { key: string; cards: PendingBarcodeCardItem[] };

function firstOf(card: PendingBarcodeCardItem) {
  return card.kind === "single" ? card.item : card.items[0];
}

/** Recently rejected submissions, to put back in the queue when rejected by mistake. */
export function RejectedBarcodesList({ cards }: { cards: PendingBarcodeCardItem[] }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [restored, setRestored] = useState<Set<string>>(new Set());
  const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { dateStyle: "medium", timeStyle: "short" });

  const groups = useMemo(() => {
    const byKey = new Map<string, Group>();
    for (const card of cards) {
      const { pending } = firstOf(card);
      const key = [pending.submitted_by, pending.barcode, card.kind === "box" ? `box:${card.boxName}` : pending.tmdb_movie_id].join("|");
      const g = byKey.get(key) ?? { key, cards: [] };
      g.cards.push(card);
      byKey.set(key, g);
    }
    const q = query.trim().toLowerCase();
    return Array.from(byKey.values()).filter((g) => {
      if (!q) return true;
      const { pending, submitter } = firstOf(g.cards[0]);
      return [pending.movie_title, pending.box_name, pending.barcode, submitter?.name, submitter?.email].some((v) => v?.toLowerCase().includes(q));
    });
  }, [cards, query]);

  async function restore(g: Group) {
    // Newest submission first (cards come sorted by submitted_at desc).
    const card = g.cards[0];
    setBusy(g.key);
    try {
      await restoreRejectedBarcodes(card.pendingIds);
      setRestored((prev) => new Set(prev).add(g.key));
      toast.success(t("rejected_restored"));
      router.refresh();
    } catch {
      toast.error(t("rejected_restore_error"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("rejected_intro")}</p>
      <SearchInput value={query} onValueChange={setQuery} placeholder={t("rejected_search")} />
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("rejected_empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {groups.map((g) => {
            const card = g.cards[0];
            const { pending, submitter } = firstOf(card);
            const poster = posterUrl(pending.movie_poster, "w200");
            const done = restored.has(g.key);
            return (
              <Card key={g.key} className={done ? "opacity-60" : undefined}>
                <CardContent className="flex gap-3 pt-5">
                  <div className="relative h-20 w-14 flex-none overflow-hidden rounded-md bg-muted">
                    {poster && <Image src={poster} alt="" fill className="object-cover" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {card.kind === "box" ? t("pending_box_title", card.boxName, card.items.length) : pending.movie_title}
                      {g.cards.length > 1 && <Badge variant="secondary">{t("rejected_times", g.cards.length)}</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("barcode_type_editie_line", pending.barcode, pending.type ?? "DVD", editionLabel(pending.editie ?? "Normaal", locale))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("pending_barcode_submitted_by")}{" "}
                      {submitter ? (
                        <Link href={`/u/${submitter.id}`} className="font-medium text-foreground hover:underline">
                          {submitter.name || submitter.email || t("pending_barcode_submitter_unknown")}
                        </Link>
                      ) : (
                        t("pending_barcode_submitter_unknown")
                      )}
                      {pending.submitted_at && <> · {date.format(new Date(pending.submitted_at))}</>}
                    </p>
                    <div className="mt-2">
                      <Button size="sm" variant="outline" disabled={busy === g.key || done} onClick={() => restore(g)}>
                        <RotateCcw />
                        {done ? t("rejected_restored_short") : t("rejected_restore")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
