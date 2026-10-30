import { getUserCollections } from "@/actions/collections";
import { BulkScan } from "@/components/bulk-scan";

export const metadata = { title: "Meerdere scannen" };

/** Scan a pile of discs in a row, then add them to one collection at once. */
export default async function BulkScanPage({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  const [collections, { collection }] = await Promise.all([getUserCollections(), searchParams]);
  const initial = collections.some((c) => c.id === collection) ? collection! : (collections[0]?.id ?? null);
  return (
    <div className="mx-auto max-w-3xl">
      <BulkScan collections={collections} initialCollectionId={initial} />
    </div>
  );
}
