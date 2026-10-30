"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { removeBoxFromCollection } from "@/actions/collections";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { undoToast } from "@/lib/undo-toast";

/** "Box verwijderen uit deze collectie" on the box page, with confirmation. */
export function BoxPageRemove({ collectionId, itemIds, boxName }: { collectionId: string; itemIds: string[]; boxName: string }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const removed = await removeBoxFromCollection(collectionId, itemIds);
      router.replace(`/collections/${collectionId}`);
      undoToast(t("undo_removed"), t("undo_action"), removed, () => router.refresh(), t("undo_error"));
    } catch {
      toast.error(t("box_remove_error"));
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" className="w-fit text-muted-foreground hover:text-destructive" onClick={() => setOpen(true)}>
        <Trash2 />
        {t("box_page_remove")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("box_remove_title")}</DialogTitle>
            <DialogDescription>{t("box_remove_confirm", boxName, itemIds.length)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {t("action_cancel")}
            </Button>
            <Button variant="destructive" onClick={remove} disabled={busy}>
              {t("action_delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
