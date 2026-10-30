"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { adminMoveBarcode } from "@/actions/admin-quality";
import { Button } from "@/components/ui/button";
import { MovieSearchPickerDialog } from "@/components/movie-search-picker-dialog";

/** "Verhuizen": pick the right film or series for this barcode. */
export function MoveBarcodeButton({ barcodeId, barcode }: { barcodeId: string; barcode: string }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(true)}>
        <ArrowRightLeft />
        {t("quality_move")}
      </Button>
      <MovieSearchPickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={async (m) => {
          setOpen(false);
          if (!window.confirm(t("quality_move_confirm", barcode, m.title))) return;
          setBusy(true);
          try {
            const r = await adminMoveBarcode(barcodeId, m.id);
            if ("error" in r) toast.error(t("quality_move_not_ready"));
            else {
              toast.success(t("quality_moved", r.moved));
              router.refresh();
            }
          } catch {
            toast.error(t("quality_move_error"));
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
