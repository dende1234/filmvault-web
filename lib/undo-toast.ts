"use client";

import { toast } from "sonner";
import { restoreCopies } from "@/actions/collections";
import type { CollectionItem } from "@/types/database";

/** After removing copies: a toast with "Ongedaan maken" that puts the exact
 * rows back (same ids, so links keep working). */
export function undoToast(message: string, undoLabel: string, rows: CollectionItem[] | null | undefined, afterUndo: () => void, errorText: string) {
  const list = (rows ?? []).filter(Boolean);
  if (list.length === 0) {
    toast.success(message);
    return;
  }
  toast.success(message, {
    duration: 8000,
    action: {
      label: undoLabel,
      onClick: () => {
        restoreCopies(list)
          .then(afterUndo)
          .catch(() => toast.error(errorText));
      },
    },
  });
}
