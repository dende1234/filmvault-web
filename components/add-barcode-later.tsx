"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Barcode } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { addBarcodeToCopy } from "@/actions/barcodes";
import { isValidEanUpc, normalizeBarcode } from "@/lib/barcode";
import { BarcodeScanButton } from "@/components/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** On a copy without a barcode: add one later (typed, scanned or from a
 * photo). Known barcode → the copy is verified at once; unknown → it goes
 * to the admins for review, like a newly scanned barcode. */
export function AddBarcodeLater({
  itemGroupId,
  onSaved,
}: {
  itemGroupId: string;
  /** The editor keeps its own copy of the item; update it right away. */
  onSaved: (patch: { barcode: string; type?: string; editie?: string; catalog_status: "verified" | "unverified" }) => void;
}) {
  const { t } = useT();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const clean = normalizeBarcode(code);
  const looksOff = clean.length > 0 && /^\d+$/.test(clean) && !isValidEanUpc(clean);

  function save(value: string) {
    const barcode = normalizeBarcode(value);
    if (!barcode) return;
    start(async () => {
      const r = await addBarcodeToCopy(itemGroupId, barcode).catch(() => ({ status: "failed" as const }));
      if (r.status === "verified") {
        onSaved({ barcode, type: r.type, editie: r.editie, catalog_status: "verified" });
        toast.success(r.type ? t("barcode_later_verified_release", r.type, r.editie ?? "") : t("barcode_later_verified"));
      } else if (r.status === "pending") {
        onSaved({ barcode, catalog_status: "unverified" });
        toast.success(t("barcode_later_pending"));
      } else if (r.status === "conflict") {
        toast.error(r.title ? t("barcode_later_conflict", r.title) : t("barcode_later_conflict_unknown"));
        return;
      } else {
        toast.error(
          t(
            r.status === "not_ready"
              ? "barcode_later_not_ready"
              : r.status === "invalid"
                ? "barcode_later_invalid"
                : r.status === "has_barcode"
                  ? "barcode_later_has_barcode"
                  : r.status === "seasons_required"
                    ? "barcode_later_seasons_required"
                    : "barcode_later_error",
          ),
        );
        return;
      }
      setCode("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Barcode className="size-5 text-primary" aria-hidden />
          {t("barcode_later_title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("barcode_later_hint")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save(code);
          }}
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            placeholder={t("barcode_later_placeholder")}
            aria-label={t("barcode_later_title")}
            className="w-48 font-mono"
            disabled={pending}
          />
          <BarcodeScanButton
            iconOnly
            onDetected={(scanned) => {
              setCode(scanned);
              save(scanned);
            }}
          />
          <Button type="submit" disabled={pending || !clean}>
            {t("barcode_later_save")}
          </Button>
        </form>
        {looksOff && <p className="text-xs text-warning">{t("barcode_later_checksum")}</p>}
      </CardContent>
    </Card>
  );
}
