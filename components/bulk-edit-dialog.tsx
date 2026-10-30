"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { bulkEditCopies, getUserCollections, type BulkPatch } from "@/actions/collections";
import { undoToast } from "@/lib/undo-toast";
import type { Collection, Condition } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const KEEP = "__keep";
const CLEAR = "__clear";
const CONDITIONS: Condition[] = ["Nieuw", "Gebruikt", "Beschadigd"];

const tagsOf = (text: string) => text.split(",").map((t) => t.trim()).filter(Boolean);

/** One change for every selected copy (tags, condition, place, trade,
 * another collection, or out of this collection with undo). */
export function BulkEditDialog({
  open,
  onOpenChange,
  collectionId,
  itemGroupIds,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  itemGroupIds: string[];
  onDone: () => void;
}) {
  const { t } = useT();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [addTags, setAddTags] = useState("");
  const [removeTags, setRemoveTags] = useState("");
  const [condition, setCondition] = useState(KEEP);
  const [locationMode, setLocationMode] = useState<"keep" | "set" | "clear">("keep");
  const [location, setLocation] = useState("");
  const [trade, setTrade] = useState(KEEP);
  const [target, setTarget] = useState(KEEP);
  const [removeHere, setRemoveHere] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) getUserCollections().then((c) => setCollections(c.filter((x) => x.id !== collectionId))).catch(() => {});
  }, [open, collectionId]);

  const patch: BulkPatch = {
    ...(tagsOf(addTags).length ? { addTags: tagsOf(addTags) } : {}),
    ...(tagsOf(removeTags).length ? { removeTags: tagsOf(removeTags) } : {}),
    ...(condition !== KEEP ? { condition: condition === CLEAR ? null : (condition as Condition) } : {}),
    ...(locationMode === "set" && location.trim() ? { location } : locationMode === "clear" ? { location: null } : {}),
    ...(trade !== KEEP ? { forTrade: trade === CLEAR ? null : (trade as "sale" | "trade" | "both") } : {}),
    ...(target !== KEEP ? { addToCollectionId: target } : {}),
    ...(removeHere ? { removeFromCollection: true } : {}),
  };
  const empty = Object.keys(patch).length === 0;

  async function apply() {
    if (removeHere && !window.confirm(t("bulk_remove_confirm", itemGroupIds.length))) return;
    setBusy(true);
    try {
      const r = await bulkEditCopies(collectionId, itemGroupIds, patch);
      if (r.error === "not_ready") toast.error(t("bulk_not_ready"));
      else if (r.error) toast.error(t("bulk_error"));
      else {
        onOpenChange(false);
        onDone();
        if (r.removed?.length) undoToast(t("bulk_done", itemGroupIds.length), t("undo_action"), r.removed, onDone, t("undo_error"));
        else toast.success(t("bulk_done", itemGroupIds.length));
      }
    } catch {
      toast.error(t("bulk_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("bulk_title", itemGroupIds.length)}</DialogTitle>
          <DialogDescription>{t("bulk_hint")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bulk-add-tags">{t("bulk_add_tags")}</Label>
            <Input id="bulk-add-tags" value={addTags} onChange={(e) => setAddTags(e.target.value)} placeholder="steelbook, cadeau" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bulk-remove-tags">{t("bulk_remove_tags")}</Label>
            <Input id="bulk-remove-tags" value={removeTags} onChange={(e) => setRemoveTags(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("collection_item_detail_condition_label")}</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={KEEP}>{t("bulk_keep")}</SelectItem>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                <SelectItem value={CLEAR}>{t("collection_item_detail_condition_none")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("trade_title")}</Label>
            <Select value={trade} onValueChange={setTrade}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={KEEP}>{t("bulk_keep")}</SelectItem>
                <SelectItem value="trade">{t("trade_trade")}</SelectItem>
                <SelectItem value="sale">{t("trade_sale")}</SelectItem>
                <SelectItem value="both">{t("trade_both")}</SelectItem>
                <SelectItem value={CLEAR}>{t("trade_none")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>{t("location_title")}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={locationMode} onValueChange={(v) => setLocationMode(v as typeof locationMode)}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">{t("bulk_keep")}</SelectItem>
                  <SelectItem value="set">{t("bulk_set")}</SelectItem>
                  <SelectItem value="clear">{t("location_none")}</SelectItem>
                </SelectContent>
              </Select>
              {locationMode === "set" && (
                <Input value={location} maxLength={80} onChange={(e) => setLocation(e.target.value)} placeholder={t("location_placeholder")} aria-label={t("location_title")} />
              )}
            </div>
          </div>
          {collections.length > 0 && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>{t("bulk_add_to_collection")}</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={KEEP}>{t("bulk_keep")}</SelectItem>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <Checkbox checked={removeHere} onCheckedChange={(v) => setRemoveHere(v === true)} className="mt-0.5" />
            {t("bulk_remove_here")}
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("action_cancel")}
          </Button>
          <Button onClick={apply} disabled={empty || busy} variant={removeHere ? "destructive" : "default"}>
            {t("bulk_apply", itemGroupIds.length)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
