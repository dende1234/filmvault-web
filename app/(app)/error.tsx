"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Clapperboard, RotateCcw } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { Button } from "@/components/ui/button";

export default function AppError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  const { t } = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
        <Clapperboard className="size-7 text-primary" aria-hidden />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{t("error_title")}</h1>
      <p className="text-sm text-muted-foreground">{t("error_description")}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button onClick={() => unstable_retry()}>
          <RotateCcw />
          {t("error_retry_button")}
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/dashboard">{t("not_found_back_button")}</Link>
        </Button>
      </div>
    </div>
  );
}
