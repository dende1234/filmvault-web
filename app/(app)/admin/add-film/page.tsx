import { loadPendingBarcodeCards } from "@/lib/admin/pending-cards";
import { AdminBarcodeStationClient } from "@/components/admin/admin-barcode-station-client";

export default async function AdminAddFilmPage() {
  const pendingCards = await loadPendingBarcodeCards();
  return (
    <div className="mx-auto max-w-2xl">
      <AdminBarcodeStationClient pendingCards={pendingCards} />
    </div>
  );
}
