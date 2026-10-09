import { loadPendingBarcodeCards } from "@/lib/admin/pending-cards";
import { AdminPendingBarcodesClient } from "@/components/admin/admin-pending-barcodes-client";

export default async function AdminPendingBarcodesPage() {
  const cards = await loadPendingBarcodeCards();
  return (
    <div className="mx-auto max-w-3xl">
      <AdminPendingBarcodesClient cards={cards} />
    </div>
  );
}
