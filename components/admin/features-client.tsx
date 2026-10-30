"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { saveFeature, type AdminFeature } from "@/actions/features";
import type { FeatureKey, FeatureMode } from "@/lib/feature-rules";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MODES: FeatureMode[] = ["off", "admins", "users", "percent", "all"];

function FeatureRow({ feature }: { feature: AdminFeature }) {
  const { t } = useT();
  const router = useRouter();
  const [mode, setMode] = useState<FeatureMode>(feature.mode);
  const [percent, setPercent] = useState(String(feature.percent));
  const [emails, setEmails] = useState(feature.emails.join("\n"));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const r = await saveFeature({ key: feature.key as FeatureKey, mode, percent: Number(percent), emails: emails.split(/[\s,;]+/) });
      if (r.error === "not_ready") toast.error(t("features_not_ready"));
      else if (r.error) toast.error(t("features_error"));
      else {
        toast.success(t("details_saved"));
        if (r.unknown?.length) toast.warning(t("features_unknown", r.unknown.join(", ")));
        router.refresh();
      }
    } catch {
      toast.error(t("features_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-5">
        <div>
          <p className="font-medium">{t(`feature_${feature.key}` as keyof Dictionary)}</p>
          <p className="text-xs text-muted-foreground">{t(`feature_${feature.key}_hint` as keyof Dictionary)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>{t("features_mode")}</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as FeatureMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`features_mode_${m}` as keyof Dictionary)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {mode === "percent" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`pct-${feature.key}`}>{t("features_percent")}</Label>
              <Input id={`pct-${feature.key}`} type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} />
            </div>
          )}
          {(mode === "users" || mode === "percent") && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={`emails-${feature.key}`}>{t("features_members")}</Label>
              <Textarea id={`emails-${feature.key}`} rows={3} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="lid@voorbeeld.nl" />
            </div>
          )}
        </div>
        <Button size="sm" className="w-fit" disabled={busy} onClick={save}>
          {t("action_save")}
        </Button>
      </CardContent>
    </Card>
  );
}

export function FeaturesClient({ features }: { features: AdminFeature[] }) {
  return (
    <div className="flex flex-col gap-3">
      {features.map((f) => (
        <FeatureRow key={f.key} feature={f} />
      ))}
    </div>
  );
}
