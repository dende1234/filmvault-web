"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { useHasCamera } from "@/lib/use-has-camera";
import { createClient } from "@/lib/supabase/client";
import { COVERS_BUCKET } from "@/lib/covers";
import { setCollectionItemCover } from "@/actions/collections";
import { Button } from "@/components/ui/button";

const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_EDGE = 1200;

/** Downscale in the browser (≤1200 px long edge, JPEG 0.85) so a 10 MB phone
 * photo becomes a ~200 kB cover, with EXIF orientation applied. */
async function toCoverJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode_failed"))), "image/jpeg", 0.85),
  );
}

/** "Eigen cover" for one copy: take a photo (only when the device has a
 * camera) or choose a file; removing goes back to the TMDB poster. */
export function CoverUpload({ itemGroupId, hasCustomCover }: { itemGroupId: string; hasCustomCover: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const hasCamera = useHasCamera();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error(t("cover_error_type"));
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast.error(t("cover_error_size"));
      return;
    }
    setBusy(true);
    try {
      const blob = await toCoverJpeg(file).catch(() => {
        throw new Error("type");
      });
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("auth");
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage.from(COVERS_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const result = await setCollectionItemCover(itemGroupId, path);
      if (result.error) {
        await supabase.storage.from(COVERS_BUCKET).remove([path]);
        throw new Error(result.error);
      }
      toast.success(t("cover_saved"));
      router.refresh();
    } catch (e) {
      toast.error(t(e instanceof Error && e.message === "type" ? "cover_error_type" : "cover_error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const result = await setCollectionItemCover(itemGroupId, null);
      if (result.error) throw new Error(result.error);
      toast.success(t("cover_removed"));
      router.refresh();
    } catch {
      toast.error(t("cover_error"));
    } finally {
      setBusy(false);
    }
  }

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) upload(file);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" className="hidden" onChange={onPick} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      {hasCamera && (
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => cameraRef.current?.click()}>
          <Camera />
          {t("cover_take_photo")}
        </Button>
      )}
      <Button variant="secondary" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
        <ImageUp />
        {t("cover_choose_file")}
      </Button>
      {hasCustomCover && (
        <Button variant="ghost" size="sm" disabled={busy} onClick={remove} className="text-muted-foreground">
          <Trash2 />
          {t("cover_remove")}
        </Button>
      )}
    </div>
  );
}
