import { ownedReleasesReady } from "@/actions/owned-releases";
import { getUserCollections } from "@/actions/collections";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import { CollectionImport } from "@/components/import/collection-import";

export const metadata = { title: "Importeren" };

export default async function CollectionImportPage() {
  const [collections, mediaTypes, edities, ready] = await Promise.all([getUserCollections(), getMediaTypes(), getEdities(), ownedReleasesReady()]);
  return (
    <div className="mx-auto max-w-4xl">
      <CollectionImport collections={collections} mediaTypes={mediaTypes} edities={edities} ownedReady={ready} />
    </div>
  );
}
