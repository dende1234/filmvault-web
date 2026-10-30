import { renderAppIcon } from "@/lib/brand/app-icon";

/** Install icons for app/manifest.ts: 192.png, 512.png, maskable-512.png. */
const FILES: Record<string, { size: number; maskable: boolean }> = {
  "192.png": { size: 192, maskable: false },
  "512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
};

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const spec = FILES[(await params).file];
  if (!spec) return new Response("Not found", { status: 404 });
  const image = renderAppIcon(spec.size, { maskable: spec.maskable });
  image.headers.set("Cache-Control", "public, max-age=604800, immutable");
  return image;
}
