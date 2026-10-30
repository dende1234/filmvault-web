"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { parsePrice } from "@/lib/purchase";
import { updateCollectionItemPurchase } from "@/actions/collections";
import type { CollectionItem } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** "Aankoop": price, date and shop of this copy (all collections it is in). */
export function PurchaseDetails({ item }: { item: CollectionItem }) {
  const { t, locale } = useT();
  const router = useRouter();
  const id = useId();
  const initialPrice = item.purchase_price != null ? Number(item.purchase_price).toLocaleString(locale === "en" ? "en-IE" : "nl-NL", { minimumFractionDigits: 2 }) : "";
  const [price, setPrice] = useState(initialPrice);
  const [date, setDate] = useState(item.purchase_date ?? "");
  const [shop, setShop] = useState(item.purchase_shop ?? "");
  const [saving, setSaving] = useState(false);

  const parsed = price.trim() ? parsePrice(price) : null;
  const priceInvalid = price.trim() !== "" && parsed === null;
  const changed = price !== initialPrice || date !== (item.purchase_date ?? "") || shop.trim() !== (item.purchase_shop ?? "");

  async function save() {
    setSaving(true);
    try {
      const result = await updateCollectionItemPurchase(item.item_group_id, { price: parsed, date: date || null, shop: shop.trim() || null });
      if (result.error === "not_ready") toast.error(t("purchase_not_ready"));
      else if (result.error) toast.error(t("purchase_error"));
      else {
        toast.success(t("details_saved"));
        router.refresh();
      }
    } catch {
      toast.error(t("purchase_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-price`}>{t("purchase_price")}</Label>
          <Input
            id={`${id}-price`}
            inputMode="decimal"
            placeholder="€ 0,00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-invalid={priceInvalid || undefined}
          />
          {priceInvalid && <p className="text-xs text-destructive">{t("purchase_price_invalid")}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-date`}>{t("purchase_date")}</Label>
          <Input id={`${id}-date`} type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-shop`}>{t("purchase_shop")}</Label>
          <Input id={`${id}-shop`} maxLength={80} placeholder={t("purchase_shop_placeholder")} value={shop} onChange={(e) => setShop(e.target.value)} />
        </div>
      </div>
      <Button size="sm" className="w-fit" onClick={save} disabled={!changed || saving || priceInvalid}>
        {t("action_save")}
      </Button>
    </div>
  );
}
