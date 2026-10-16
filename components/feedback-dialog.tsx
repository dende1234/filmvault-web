"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/locale-provider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FeedbackForm } from "@/components/feedback-form";

/** In-app "Feedback geven" (signed-in users). Remounting the form per open
 * (key) gives a fresh form and fill timer each time. The page it was opened
 * from is sent along. */
export function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useT();
  const pathname = usePathname();
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((s) => s + 1);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("feedback_title")}</DialogTitle>
          <DialogDescription>{t("feedback_intro")}</DialogDescription>
        </DialogHeader>
        <FeedbackForm key={session} signedIn page={pathname} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
