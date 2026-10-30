"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/locale-provider";
import type { Collection } from "@/types/database";
import { AddFilmFlow } from "@/components/add-film-flow";
import { AddBoxFlow } from "@/components/add-box-flow";
import { BulkScan } from "@/components/bulk-scan";
import { ShopMode } from "@/components/shop-mode";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ScanMode = "een" | "meerdere" | "winkel";

/** /scannen: the three ways to scan in one place. Only the active tab is
 * mounted (Radix), so switching tabs also stops that tab's camera. The mode
 * lives in the URL (?modus=) so links and the back button keep it. */
export function ScanHub({
  mode,
  collections,
  initialCollectionId,
}: {
  mode: ScanMode;
  collections: Collection[];
  initialCollectionId: string | null;
}) {
  const { t } = useT();
  const router = useRouter();

  return (
    <Tabs value={mode} onValueChange={(v) => router.replace(v === "een" ? "/scannen" : `/scannen?modus=${v}`, { scroll: false })}>
      <TabsList className="mb-6">
        <TabsTrigger value="een">{t("scan_hub_single")}</TabsTrigger>
        <TabsTrigger value="meerdere">{t("scan_hub_bulk")}</TabsTrigger>
        <TabsTrigger value="winkel">{t("scan_hub_shop")}</TabsTrigger>
      </TabsList>
      <TabsContent value="een" className="flex flex-col gap-6">
        <PageHeader title={t("scan_hub_single_title")} description={t("scan_hub_single_description")} />
        <div className="flex flex-wrap gap-2">
          <AddFilmFlow showModeLinks={false} />
          <AddBoxFlow />
        </div>
      </TabsContent>
      <TabsContent value="meerdere">
        <BulkScan collections={collections} initialCollectionId={initialCollectionId} />
      </TabsContent>
      <TabsContent value="winkel">
        <ShopMode />
      </TabsContent>
    </Tabs>
  );
}
