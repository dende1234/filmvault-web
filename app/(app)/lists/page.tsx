import { getAllListsWithMeta } from "@/actions/curated-lists";
import { ListsPageClient } from "@/components/lists-page-client";

export default async function ListsPage() {
  const items = await getAllListsWithMeta();
  return (
    <div className="mx-auto max-w-3xl">
      <ListsPageClient items={items} />
    </div>
  );
}
