"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/locale-provider";
import { setLocale } from "@/actions/profile";
import type { Locale } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "nl", label: "NL" },
  { value: "en", label: "EN" },
];

/** "NL | EN" for visitors without an account. A pick is an explicit choice
 * (fv_locale cookie) that overrides region/browser detection, and carries
 * over to the profile on registration. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, locale } = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div role="group" aria-label={t("language_switcher_label")} className={cn("inline-flex items-center rounded-full border border-border bg-card/70 p-0.5 text-xs font-semibold", className)}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => choose(opt.value)}
          disabled={isPending}
          aria-pressed={locale === opt.value}
          lang={opt.value}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
            locale === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
