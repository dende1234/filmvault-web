"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { singleFormats } from "@/lib/formats";
import type { SmartFilter } from "@/lib/smart-filter";
import { getMediaTypes } from "@/actions/media-types";
import { saveSmartCollection, type SmartCollection } from "@/actions/smart-collections";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ANY = "any";
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const join = (l?: string[]) => (l ?? []).join(", ");

/** Create or edit a smart collection: a name and the conditions it fills on. */
export function SmartCollectionDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: SmartCollection;
}) {
  const { t } = useT();
  const router = useRouter();
  const f = existing?.filter ?? {};
  const [name, setName] = useState(existing?.name ?? "");
  const [formats, setFormats] = useState<string[]>(f.formats ?? []);
  const [known, setKnown] = useState<string[]>([]);
  const [tags, setTags] = useState(join(f.tags));
  const [labels, setLabels] = useState(join(f.labels));
  const [locations, setLocations] = useState(join(f.locations));
  const [editions, setEditions] = useState(join(f.editions));
  const [watched, setWatched] = useState<string>(f.watched ?? ANY);
  const [kind, setKind] = useState<string>(f.kind ?? ANY);
  const [minRating, setMinRating] = useState<string>(f.minRating ? String(f.minRating) : ANY);
  const [forTrade, setForTrade] = useState(!!f.forTrade);
  const [favorite, setFavorite] = useState(!!f.favorite);
  const [text, setText] = useState(f.text ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) getMediaTypes().then((m) => setKnown(singleFormats(m))).catch(() => {});
  }, [open]);

  const filter: SmartFilter = {
    ...(formats.length ? { formats } : {}),
    ...(list(tags).length ? { tags: list(tags) } : {}),
    ...(list(labels).length ? { labels: list(labels) } : {}),
    ...(list(locations).length ? { locations: list(locations) } : {}),
    ...(list(editions).length ? { editions: list(editions) } : {}),
    ...(watched !== ANY ? { watched: watched as SmartFilter["watched"] } : {}),
    ...(kind !== ANY ? { kind: kind as SmartFilter["kind"] } : {}),
    ...(minRating !== ANY ? { minRating: Number(minRating) } : {}),
    ...(forTrade ? { forTrade: true } : {}),
    ...(favorite ? { favorite: true } : {}),
    ...(text.trim() ? { text: text.trim() } : {}),
  };
  const valid = name.trim() !== "" && Object.keys(filter).length > 0;

  async function save() {
    setBusy(true);
    try {
      const r = await saveSmartCollection({ id: existing?.id, name, filter });
      if (r.error === "not_ready") toast.error(t("smart_not_ready"));
      else if (r.error) toast.error(t("smart_invalid"));
      else {
        onOpenChange(false);
        router.push(`/collections/slim/${r.id}`);
        router.refresh();
      }
    } catch {
      toast.error(t("smart_error"));
    } finally {
      setBusy(false);
    }
  }

  const text3 = (id: string, label: string, value: string, set: (v: string) => void, placeholder?: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? t("smart_edit") : t("smart_new")}</DialogTitle>
          <DialogDescription>{t("smart_hint")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="smart-name">{t("label_name")}</Label>
            <Input id="smart-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t("smart_name_placeholder")} />
          </div>
          {known.length > 0 && (
            <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
              <legend className="mb-1 text-sm font-medium">{t("smart_formats")}</legend>
              <div className="flex flex-wrap gap-3">
                {known.map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={formats.includes(k)} onCheckedChange={(v) => setFormats((p) => (v === true ? [...p, k] : p.filter((x) => x !== k)))} />
                    {k}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {text3("smart-tags", t("smart_tags"), tags, setTags, "steelbook")}
          {text3("smart-labels", t("details_label"), labels, setLabels, "Criterion, Arrow Video")}
          {text3("smart-editions", t("smart_editions"), editions, setEditions, "Steelbook, Collector's Edition")}
          {text3("smart-locations", t("location_title"), locations, setLocations)}
          <div className="flex flex-col gap-1.5">
            <Label>{t("watched_label")}</Label>
            <Select value={watched} onValueChange={setWatched}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("smart_any")}</SelectItem>
                <SelectItem value="watched">{t("watched_label")}</SelectItem>
                <SelectItem value="not_watched">{t("not_watched_label")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("smart_kind")}</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("smart_any")}</SelectItem>
                <SelectItem value="movie">{t("picker_kind_movies")}</SelectItem>
                <SelectItem value="tv">{t("picker_kind_series")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("smart_min_rating")}</Label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("smart_any")}</SelectItem>
                {["3", "3.5", "4", "4.5", "5"].map((r) => (
                  <SelectItem key={r} value={r}>
                    ★ {r}+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {text3("smart-text", t("smart_text"), text, setText)}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={forTrade} onCheckedChange={(v) => setForTrade(v === true)} />
            {t("smart_for_trade")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={favorite} onCheckedChange={(v) => setFavorite(v === true)} />
            {t("smart_favorite")}
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("action_cancel")}
          </Button>
          <Button onClick={save} disabled={!valid || busy}>
            {t("action_save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
