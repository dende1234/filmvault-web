"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { setCopyCollections } from "@/actions/collections";
import type { Collection } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** "In collecties": tick which of your collections this copy (or box) is in.
 * Adding shares the copy's item_group_id, so it stays one physical copy. */
export function CopyCollections({
  itemId,
  isBox,
  collections,
  initialIds,
}: {
  itemId: string;
  isBox: boolean;
  collections: Collection[];
  initialIds: string[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialIds));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = selected.size !== initialIds.length || initialIds.some((id) => !selected.has(id));

  function toggle(id: string, on: boolean) {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function save() {
    if (selected.size === 0) {
      setError(t("copy_collections_empty"));
      return;
    }
    setSaving(true);
    try {
      const result = await setCopyCollections(itemId, Array.from(selected));
      if (result.error === "empty") setError(t("copy_collections_empty"));
      else if (result.error) toast.error(t("copy_collections_error"));
      else {
        toast.success(t("copy_collections_saved"));
        // The current collection was unticked: show this copy in one it is still in.
        if (result.itemId && result.itemId !== itemId) router.replace(`/collections/${result.collectionId}/items/${result.itemId}`);
        else router.refresh();
      }
    } catch {
      toast.error(t("copy_collections_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {collections.map((c) => (
          <li key={c.id} className="flex items-center gap-3">
            <Checkbox id={`copy-col-${c.id}`} checked={selected.has(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} />
            <Label htmlFor={`copy-col-${c.id}`} className="min-w-0 cursor-pointer truncate font-normal">
              {c.name}
            </Label>
          </li>
        ))}
      </ul>
      {isBox && <p className="text-xs text-muted-foreground">{t("copy_collections_hint_box")}</p>}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/collections" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Plus className="size-4" />
          {t("copy_collections_new")}
        </Link>
        <Button size="sm" onClick={save} disabled={!changed || saving}>
          {t("copy_collections_save")}
        </Button>
      </div>
    </div>
  );
}
