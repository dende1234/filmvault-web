"use client";

import { useT } from "@/lib/i18n/locale-provider";
import type { PendingBarcodeCardItem } from "@/types/database";
import { PendingBarcodesList } from "@/components/admin/pending-barcodes-list";

export function AdminPendingBarcodesClient({ cards }: { cards: PendingBarcodeCardItem[] }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t("pending_approvals_label")}</h1>
      <PendingBarcodesList cards={cards} />
    </div>
  );
}
