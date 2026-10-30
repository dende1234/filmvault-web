"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import type { SmartCollection } from "@/actions/smart-collections";
import { Button } from "@/components/ui/button";
import { SmartCollectionDialog } from "@/components/smart-collection-dialog";

/** On /collections: your smart collections, and making a new one. */
export function SmartCollectionsSection({ items }: { items: SmartCollection[] }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
          <Sparkles className="size-5 text-primary" aria-hidden />
          {t("smart_title")}
        </h2>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Plus />
          {t("smart_new")}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("smart_empty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((s) => (
            <li key={s.id}>
              <Link href={`/collections/slim/${s.id}`} className="inline-flex rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary/60">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {open && <SmartCollectionDialog open={open} onOpenChange={setOpen} />}
    </section>
  );
}
