"use client";

import { Printer } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";

/** The browser's own print dialog, which also saves as PDF. */
export function PrintButton() {
  const { t } = useT();
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      <Printer />
      {t("print_button")}
    </Button>
  );
}
