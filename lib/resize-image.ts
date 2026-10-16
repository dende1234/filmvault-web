/** Client-side only (canvas). Shared by custom covers and feedback screenshots. */

/** Larger originals are refused before decoding. */
export const MAX_IMAGE_INPUT_BYTES = 25 * 1024 * 1024;

/** Downscale in the browser (long edge ≤ maxEdge, JPEG 0.85) so a 10 MB phone
 * photo becomes a ~200 kB upload, with EXIF orientation applied. */
export async function toJpeg(file: File, maxEdge: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode_failed"))), "image/jpeg", 0.85),
  );
}
