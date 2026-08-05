"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/locale-provider";
import type { CollectionItem } from "@/types/database";
import { Button } from "@/components/ui/button";

/** Picks a random not-yet-watched item and navigates to it — mirrors
 * DashboardViewModel.kt's pickSurprise() exactly, just client-side here since there's no
 * server-round-trip needed for a purely local random pick. */
export function SurpriseMeButton({ unwatchedItems }: { unwatchedItems: CollectionItem[] }) {
  const router = useRouter();
  const { t } = useT();

  if (unwatchedItems.length === 0) return null;

  function pickSurprise() {
    const item = unwatchedItems[Math.floor(Math.random() * unwatchedItems.length)];
    router.push(`/collections/${item.collection_id}/items/${item.id}`);
  }

  return (
    <Button variant="outline" onClick={pickSurprise}>
      {t("dashboard_surprise_me_button")}
    </Button>
  );
}
