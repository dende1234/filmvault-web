import { getUserCollections } from "@/actions/collections";
import { ScanHub, type ScanMode } from "@/components/scan/scan-hub";
import { featureOn } from "@/lib/features";
import { getEdities, getMediaTypes } from "@/actions/media-types";

export const metadata = { title: "Scannen" };

const MODES: ScanMode[] = ["een", "meerdere", "winkel", "kast"];

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ modus?: string; collection?: string }> }) {
  const [collections, { modus, collection }, shelf] = await Promise.all([getUserCollections(), searchParams, featureOn("shelf_scan")]);
  const found = MODES.find((m) => m === modus) ?? "een";
  const mode = found === "kast" && !shelf ? "een" : found;
  const [mediaTypes, edities] = shelf ? await Promise.all([getMediaTypes(), getEdities()]) : [[], []];
  const initial = collections.some((c) => c.id === collection) ? collection! : (collections[0]?.id ?? null);
  return (
    <div className="mx-auto max-w-3xl">
      <ScanHub mode={mode} collections={collections} initialCollectionId={initial} shelf={shelf ? { mediaTypes, edities } : null} />
    </div>
  );
}
