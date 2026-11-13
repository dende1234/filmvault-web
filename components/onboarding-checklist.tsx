"use client";

import Link from "next/link";
import { FileUp, ScanBarcode, Search } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { useLocalFlag } from "@/lib/use-local-flag";
import { AddFilmFlow } from "@/components/add-film-flow";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/** Start with ownership. Social/profile steps can wait until a collection is
 * useful. The dismissal is scoped to the signed-in member on this device. */
export function OnboardingChecklist({ titleCount, userId }: { titleCount: number; userId: string }) {
  const { t } = useT();
  const [dismissed, setDismissed] = useLocalFlag(`filmory.onboarding.v2.${userId}`);
  if (titleCount >= 5 || dismissed) return null;

  return (
    <section className="flex flex-col gap-5 rounded-card border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{t("onboarding_first_five")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("onboarding_choose_route")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>{t("onboarding_dismiss")}</Button>
      </div>
      <Progress value={titleCount} max={5} label={t("onboarding_five_progress", titleCount)} />
      <p className="text-sm text-muted-foreground">{t("onboarding_five_progress", titleCount)}</p>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4">
          <ScanBarcode className="size-5 text-primary" aria-hidden />
          <h3 className="font-medium">{t("onboarding_scan")}</h3>
          <p className="flex-1 text-sm text-muted-foreground">{t("onboarding_scan_hint")}</p>
          <Button asChild variant="secondary"><Link href="/scannen">{t("nav_scan")}</Link></Button>
        </div>
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4">
          <Search className="size-5 text-primary" aria-hidden />
          <h3 className="font-medium">{t("onboarding_search")}</h3>
          <p className="flex-1 text-sm text-muted-foreground">{t("onboarding_search_hint")}</p>
          <AddFilmFlow searchOnly />
        </div>
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4">
          <FileUp className="size-5 text-primary" aria-hidden />
          <h3 className="font-medium">{t("onboarding_import")}</h3>
          <p className="flex-1 text-sm text-muted-foreground">{t("onboarding_import_hint")}</p>
          <Button asChild variant="secondary"><Link href="/collections/import">{t("import_title")}</Link></Button>
        </div>
      </div>
    </section>
  );
}
