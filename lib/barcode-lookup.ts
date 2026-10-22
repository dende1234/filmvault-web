import "server-only";

/** Product title for a barcode from UPCitemdb's free endpoint (no key; about
 * 100 lookups a day, US/UK releases mostly). Only a hint for unknown
 * barcodes: the user confirms the film and the barcode still goes through
 * approval. Cached 30 days per barcode; null when unknown or rate-limited. */
export async function lookupProductTitle(barcode: string): Promise<string | null> {
  if (!/^\d{8,14}$/.test(barcode)) return null;
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`, {
      next: { revalidate: 30 * 24 * 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: { title?: string }[] };
    return data.items?.find((i) => i.title)?.title ?? null;
  } catch {
    return null;
  }
}
