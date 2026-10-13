import { getUserCollections } from "@/actions/collections";
import { getEdities, getMediaTypes } from "@/actions/media-types";
import { CollectionImport } from "@/components/import/collection-import";

export const metadata = { title: "Importeren" };

export default async function CollectionImportPage() {
  const [collections, mediaTypes, edities] = await Promise.all([getUserCollections(), getMediaTypes(), getEdities()]);
  return (
    <div className="mx-auto max-w-4xl">
      <CollectionImport collections={collections} mediaTypes={mediaTypes} edities={edities} />
    </div>
  );
}
