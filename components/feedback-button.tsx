"use client";

import { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/feedback-dialog";

/** "Nieuwe melding" button that opens the in-app feedback dialog. */
export function FeedbackButton() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <MessageSquareText />
        {t("feedback_new")}
      </Button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
