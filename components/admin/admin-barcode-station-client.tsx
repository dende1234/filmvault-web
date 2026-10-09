"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/locale-provider";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import type { PendingBarcodeCardItem } from "@/types/database";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarcodeQuickEntry } from "@/components/admin/barcode-quick-entry";
import { BarcodeBulkImport } from "@/components/admin/barcode-bulk-import";
import { PendingBarcodesList } from "@/components/admin/pending-barcodes-list";

/** One screen for linking barcodes to films: quick keyboard entry, CSV
 * bulk import, and the pending-approval queue. */
export function AdminBarcodeStationClient({ pendingCards }: { pendingCards: PendingBarcodeCardItem[] }) {
  const { t } = useT();
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  const [edities, setEdities] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([getMediaTypes(), getEdities()]).then(([types, eds]) => {
      setMediaTypes(types);
      setEdities(eds);
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{t("admin_add_film_title")}</h1>
      <p className="text-sm text-muted-foreground">{t("admin_add_film_description")}</p>

      <Tabs defaultValue="quick">
        <TabsList className="flex-wrap">
          <TabsTrigger value="quick">{t("admin_station_tab_quick")}</TabsTrigger>
          <TabsTrigger value="bulk">{t("admin_station_tab_bulk")}</TabsTrigger>
          <TabsTrigger value="pending">{t("admin_station_tab_pending", pendingCards.length)}</TabsTrigger>
        </TabsList>
        <TabsContent value="quick">
          <BarcodeQuickEntry mediaTypes={mediaTypes} edities={edities} />
        </TabsContent>
        <TabsContent value="bulk">
          <BarcodeBulkImport mediaTypes={mediaTypes} edities={edities} />
        </TabsContent>
        <TabsContent value="pending">
          <PendingBarcodesList cards={pendingCards} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
