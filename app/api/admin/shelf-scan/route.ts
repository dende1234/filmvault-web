import { requireAdmin } from "@/lib/require-admin";
import { scanShelfPhoto, ShelfScanUnavailableError } from "@/lib/ai/shelf-scan";
import { withinLimit } from "@/lib/rate-limit";

// A Route Handler rather than a Server Action: a shelf photo can be close to
// the 1 MB Server Action body limit, and the vision call can take a while.
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Admin only (for now): photo of a shelf in, recognized titles out. The
 * photo is passed through to the Claude API and not stored. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await withinLimit("shelf_scan"))) return Response.json({ error: "rate_limited" }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(photo instanceof Blob)) return Response.json({ error: "no_photo" }, { status: 400 });
  if (photo.size > MAX_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
  const type = TYPES.find((t) => t === photo.type);
  if (!type) return Response.json({ error: "bad_type" }, { status: 415 });

  try {
    const items = await scanShelfPhoto(Buffer.from(await photo.arrayBuffer()), type);
    return Response.json({ items });
  } catch (e) {
    if (e instanceof ShelfScanUnavailableError) return Response.json({ error: "unavailable" }, { status: 503 });
    console.error("shelf scan failed", e);
    return Response.json({ error: "scan_failed" }, { status: 502 });
  }
}
