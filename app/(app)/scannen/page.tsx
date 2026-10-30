import { getUserCollections } from "@/actions/collections";
import { ScanHub, type ScanMode } from "@/components/scan/scan-hub";

export const metadata = { title: "Scannen" };

const MODES: ScanMode[] = ["een", "meerdere", "winkel"];

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ modus?: string; collection?: string }> }) {
  const [collections, { modus, collection }] = await Promise.all([getUserCollections(), searchParams]);
  const mode = MODES.find((m) => m === modus) ?? "een";
  const initial = collections.some((c) => c.id === collection) ? collection! : (collections[0]?.id ?? null);
  return (
    <div className="mx-auto max-w-3xl">
      <ScanHub mode={mode} collections={collections} initialCollectionId={initial} />
    </div>
  );
}
