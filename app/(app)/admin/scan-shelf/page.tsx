import { getUserCollections } from "@/actions/collections";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import { ShelfScanClient } from "@/components/admin/shelf-scan-client";

export const metadata = { title: "Kast scannen" };

export default async function AdminScanShelfPage() {
  const [collections, mediaTypes, edities] = await Promise.all([getUserCollections(), getMediaTypes(), getEdities()]);
  return (
    <div className="mx-auto max-w-4xl">
      <ShelfScanClient collections={collections} mediaTypes={mediaTypes} edities={edities} />
    </div>
  );
}
