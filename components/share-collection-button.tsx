"use client";

import { useState, useTransition } from "react";
import { Copy, Globe, Lock, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { setCollectionPublic } from "@/actions/collections";
import { setWishlistPublic } from "@/actions/wishlist";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ShareKey =
  | "button" | "copied" | "copy" | "description" | "error" | "link_label" | "privacy_note"
  | "public_label" | "public_on" | "public_off" | "share" | "title";

/** Owner-only "Delen": switch "openbaar via link" on/off and copy/share the
 * public link. Off by default. For a collection (/c/<id>, collectionId set)
 * or your wishlist (/v/<userId>, kind "wishlist"). */
export function ShareCollectionButton({
  kind = "collection",
  collectionId,
  initialPublic,
  shareUrl,
}: {
  kind?: "collection" | "wishlist";
  collectionId?: string;
  initialPublic: boolean;
  shareUrl: string;
}) {
  const { t: translate } = useT();
  const t = (key: `share_collection_${ShareKey}`) =>
    translate((kind === "wishlist" ? key.replace("share_collection_", "share_wishlist_") : key) as keyof Dictionary);
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    setIsPublic(next);
    startTransition(async () => {
      const result = kind === "wishlist" ? await setWishlistPublic(next) : await setCollectionPublic(collectionId!, next);
      if (result.error) {
        setIsPublic(!next);
        toast.error(t("share_collection_error"));
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("share_collection_copied"));
    } catch {
      toast.error(translate("invite_copied_failed"));
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "Filmory", url: shareUrl });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) await copy();
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {isPublic ? <Globe className="text-primary" /> : <Share2 />}
        {t("share_collection_button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("share_collection_title")}</DialogTitle>
            <DialogDescription>{t("share_collection_description")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3">
              <Checkbox id={`${kind}-public`} checked={isPublic} disabled={isPending} onCheckedChange={(v) => toggle(v === true)} className="mt-0.5" />
              <Label htmlFor={`${kind}-public`} className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 font-medium">
                  {isPublic ? <Globe className="size-4 text-primary" /> : <Lock className="size-4 text-muted-foreground" />}
                  {t("share_collection_public_label")}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {isPublic ? t("share_collection_public_on") : t("share_collection_public_off")}
                </span>
              </Label>
            </div>

            {isPublic && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Input readOnly value={shareUrl} onFocus={(e) => e.target.select()} className="font-mono text-xs" aria-label={t("share_collection_link_label")} />
                  <Button variant="secondary" size="icon" onClick={copy} aria-label={t("share_collection_copy")}>
                    <Copy />
                  </Button>
                </div>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <Button onClick={share} className="w-fit">
                    <Share2 />
                    {t("share_collection_share")}
                  </Button>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">{t("share_collection_privacy_note")}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
