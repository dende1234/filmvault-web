"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { updateCollectionItemTrade } from "@/actions/collections";
import type { CollectionItem } from "@/types/database";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "none";
type Trade = NonNullable<CollectionItem["for_trade"]>;

/** "Te koop / te ruil" for this copy; friends see it when they compare. */
export function TradeSelect({ item }: { item: CollectionItem }) {
  const { t } = useT();
  const router = useRouter();
  const [value, setValue] = useState<string>(item.for_trade ?? NONE);

  async function change(next: string) {
    const prev = value;
    setValue(next);
    try {
      const r = await updateCollectionItemTrade(item.item_group_id, next === NONE ? null : (next as Trade));
      if (r.error) {
        setValue(prev);
        toast.error(t("trade_not_ready"));
      } else router.refresh();
    } catch {
      setValue(prev);
      toast.error(t("trade_error"));
    }
  }

  return (
    <Select value={value} onValueChange={change}>
      <SelectTrigger className="w-full sm:w-64" aria-label={t("trade_title")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t("trade_none")}</SelectItem>
        <SelectItem value="trade">{t("trade_trade")}</SelectItem>
        <SelectItem value="sale">{t("trade_sale")}</SelectItem>
        <SelectItem value="both">{t("trade_both")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
