"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { deleteSmartCollection, type SmartCollection } from "@/actions/smart-collections";
import { Button } from "@/components/ui/button";
import { SmartCollectionDialog } from "@/components/smart-collection-dialog";

export function SmartCollectionActions({ collection }: { collection: SmartCollection }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil />
        {t("smart_edit")}
      </Button>
      <Button
        variant="ghost"
        onClick={async () => {
          if (!window.confirm(t("smart_delete_confirm", collection.name))) return;
          try {
            await deleteSmartCollection(collection.id);
            router.replace("/collections");
          } catch {
            toast.error(t("smart_error"));
          }
        }}
        aria-label={t("action_delete")}
      >
        <Trash2 />
      </Button>
      {open && <SmartCollectionDialog open={open} onOpenChange={setOpen} existing={collection} />}
    </div>
  );
}
