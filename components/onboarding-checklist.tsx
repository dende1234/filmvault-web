"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { useLocalFlag } from "@/lib/use-local-flag";
import { AddFilmFlow } from "@/components/add-film-flow";
import { InviteButton } from "@/components/invite-button";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** First-run checklist on the dashboard — gets a new member to their first
 * meaningful action (the activation metric in the marketing plan). Progress
 * is derived from real data; hiding it is a per-viewer convenience. */
export function OnboardingChecklist({
  hasCollection,
  hasFilm,
  hasConnection,
  hasName,
  inviteUrl,
}: {
  hasCollection: boolean;
  hasFilm: boolean;
  hasConnection: boolean;
  hasName: boolean;
  inviteUrl: string;
}) {
  const { t } = useT();
  const [dismissed, setDismissed] = useLocalFlag("filmory.onboarding.dismissed");

  const steps = [
    {
      done: hasCollection,
      title: t("onboarding_step_collection"),
      hint: t("onboarding_step_collection_hint"),
      action: (
        <Button asChild size="sm">
          <Link href="/collections">{t("onboarding_go")}</Link>
        </Button>
      ),
    },
    { done: hasFilm, title: t("onboarding_step_film"), hint: t("onboarding_step_film_hint"), action: <AddFilmFlow /> },
    {
      done: hasConnection,
      title: t("onboarding_step_connect"),
      hint: t("onboarding_step_connect_hint"),
      action: (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/friends">{t("nav_friends")}</Link>
          </Button>
          <InviteButton url={inviteUrl} size="sm" />
        </div>
      ),
    },
    {
      done: hasName,
      title: t("onboarding_step_profile"),
      hint: t("onboarding_step_profile_hint"),
      action: (
        <Button asChild size="sm" variant="secondary">
          <Link href="/profile">{t("onboarding_go")}</Link>
        </Button>
      ),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  // The first not-done step gets the action button; later ones just list.
  const nextIndex = steps.findIndex((s) => !s.done);

  if (doneCount === steps.length || dismissed) return null;

  return (
    <section className="flex flex-col gap-5 rounded-card border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl font-semibold tracking-tight">{t("onboarding_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("onboarding_subtitle", doneCount, steps.length)}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
          {t("onboarding_dismiss")}
        </Button>
      </div>
      <Progress value={doneCount} max={steps.length} label={t("onboarding_subtitle", doneCount, steps.length)} />
      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className={cn(
              "flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 p-3 sm:flex-row sm:items-center",
              i === nextIndex && "border-primary/40 bg-card",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1",
                step.done ? "bg-primary text-primary-foreground ring-primary" : "bg-elevated text-muted-foreground ring-border",
              )}
            >
              {step.done ? <Check className="size-4" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", step.done && "text-muted-foreground line-through")}>{step.title}</p>
              {!step.done && <p className="text-xs text-muted-foreground">{step.hint}</p>}
            </div>
            {i === nextIndex && <div className="shrink-0">{step.action}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
