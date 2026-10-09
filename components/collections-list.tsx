"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LibraryBig, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { createCollection } from "@/actions/collections";
import type { Collection } from "@/types/database";
import { CollectionCard, type CollectionPreview } from "@/components/collection-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CollectionsList({
  collections,
  previews,
}: {
  collections: Collection[];
  previews: Record<string, CollectionPreview>;
}) {
  const { t } = useT();
  const router = useRouter();
  const [sort, setSort] = useState<"name" | "newest">("name");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...collections];
    if (sort === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
    else copy.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    return copy;
  }, [collections, sort]);

  async function handleCreate() {
    if (!name.trim()) {
      setError(t("collections_error_create_name_required"));
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      await createCollection(name.trim(), description.trim() || null);
      setShowCreate(false);
      setName("");
      setDescription("");
      router.refresh();
    } catch {
      setError(t("collections_error_create"));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("collections_label")}
        actions={
          <>
            <Select value={sort} onValueChange={(v) => setSort(v as "name" | "newest")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{t("label_name")}</SelectItem>
                <SelectItem value="newest">{t("collections_sort_newest")}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreate(true)}>
              <Plus />
              {t("action_add")}
            </Button>
          </>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={LibraryBig}
          title={t("collections_empty")}
          description={t("collections_empty_description")}
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus />
              {t("collections_new_title")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((c) => {
            const preview = previews[c.id] ?? { count: 0, posters: [] };
            return (
              <CollectionCard
                key={c.id}
                collection={c}
                preview={preview}
                href={`/collections/${c.id}`}
                countLabel={t("collections_film_count", preview.count)}
              />            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("collections_new_title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input placeholder={t("label_name")} value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea
              placeholder={t("collections_description_label")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {t("action_cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {t("collections_create_button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
