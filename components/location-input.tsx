"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { getMyLocations, updateCollectionItemLocation } from "@/actions/collections";
import type { CollectionItem } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** "Plek in de kast" for this copy, with the places you used before. */
export function LocationInput({ item }: { item: CollectionItem }) {
  const { t } = useT();
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(item.shelf_location ?? "");
  const [known, setKnown] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyLocations().then(setKnown).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      const r = await updateCollectionItemLocation(item.item_group_id, value);
      if (r.error) toast.error(t("location_not_ready"));
      else {
        toast.success(t("details_saved"));
        router.refresh();
      }
    } catch {
      toast.error(t("location_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        list={`${id}-places`}
        maxLength={80}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("location_placeholder")}
        aria-label={t("location_title")}
        className="sm:max-w-sm"
      />
      <datalist id={`${id}-places`}>
        {known.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <Button size="sm" className="h-10 w-fit" disabled={saving || value.trim() === (item.shelf_location ?? "")} onClick={save}>
        {t("action_save")}
      </Button>
    </div>
  );
}
