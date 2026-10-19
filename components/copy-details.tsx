"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { CUTS, LABELS, LANGUAGES, languageName } from "@/lib/copy-details";
import { updateCollectionItemDetails } from "@/actions/collections";
import type { CollectionItem } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NONE = "__none";
const OTHER = "__other";

function LanguagePicker({ id, label, value, onChange }: { id: string; label: string; value: string[]; onChange: (v: string[]) => void }) {
  const { t, locale } = useT();
  const options = useMemo(
    () =>
      LANGUAGES.filter((c) => !value.includes(c))
        .map((c) => ({ code: c, name: languageName(c, locale) }))
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    [value, locale],
  );
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((code) => (
            <li key={code}>
              <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2.5 py-1 text-xs ring-1 ring-inset ring-border">
                {languageName(code, locale)}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((c) => c !== code))}
                  className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={t("details_remove_language", languageName(code, locale))}
                >
                  <X className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {/* Remount after each pick so the trigger shows the placeholder again. */}
      <Select key={value.join(",")} onValueChange={(code) => onChange([...value, code])}>
        <SelectTrigger id={id} className="w-full sm:w-64">
          <SelectValue placeholder={t("details_add_language")} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.code} value={o.code}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** "Details van dit exemplaar": cut, audio/subtitle languages and label.
 * Apply to the whole copy (every collection it is in). */
export function CopyDetails({ item }: { item: CollectionItem }) {
  const { t } = useT();
  const router = useRouter();
  const baseId = useId();
  const initialCut = item.cut ?? "";
  const isKnownCut = (CUTS as readonly string[]).includes(initialCut);
  const [cutChoice, setCutChoice] = useState(initialCut ? (isKnownCut ? initialCut : OTHER) : NONE);
  const [cutOther, setCutOther] = useState(isKnownCut ? "" : initialCut);
  const [label, setLabel] = useState(item.label ?? "");
  const [audio, setAudio] = useState<string[]>(item.audio_languages ?? []);
  const [subs, setSubs] = useState<string[]>(item.subtitle_languages ?? []);
  const [saving, setSaving] = useState(false);

  const cut = cutChoice === NONE ? "" : cutChoice === OTHER ? cutOther.trim() : cutChoice;
  const changed =
    cut !== initialCut ||
    label.trim() !== (item.label ?? "") ||
    audio.join(",") !== (item.audio_languages ?? []).join(",") ||
    subs.join(",") !== (item.subtitle_languages ?? []).join(",");

  async function save() {
    setSaving(true);
    try {
      const result = await updateCollectionItemDetails(item.item_group_id, {
        cut: cut || null,
        label: label.trim() || null,
        audioLanguages: audio,
        subtitleLanguages: subs,
      });
      if (result.error === "not_ready") toast.error(t("details_not_ready"));
      else if (result.error) toast.error(t("details_error"));
      else {
        toast.success(t("details_saved"));
        router.refresh();
      }
    } catch {
      toast.error(t("details_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${baseId}-cut`}>{t("details_cut")}</Label>
          <Select value={cutChoice} onValueChange={setCutChoice}>
            <SelectTrigger id={`${baseId}-cut`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("details_cut_none")}</SelectItem>
              {CUTS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
              <SelectItem value={OTHER}>{t("details_cut_other")}</SelectItem>
            </SelectContent>
          </Select>
          {cutChoice === OTHER && (
            <Input
              aria-label={t("details_cut_other")}
              placeholder={t("details_cut_other_placeholder")}
              maxLength={60}
              value={cutOther}
              onChange={(e) => setCutOther(e.target.value)}
            />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${baseId}-label`}>{t("details_label")}</Label>
          <Input
            id={`${baseId}-label`}
            list={`${baseId}-labels`}
            placeholder={t("details_label_placeholder")}
            maxLength={80}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <datalist id={`${baseId}-labels`}>
            {LABELS.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>
      </div>
      <LanguagePicker id={`${baseId}-audio`} label={t("details_audio")} value={audio} onChange={setAudio} />
      <LanguagePicker id={`${baseId}-subs`} label={t("details_subtitles")} value={subs} onChange={setSubs} />
      <Button size="sm" className="w-fit" onClick={save} disabled={!changed || saving || (cutChoice === OTHER && !cutOther.trim())}>
        {t("action_save")}
      </Button>
    </div>
  );
}
