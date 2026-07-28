"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/locale-provider";
import { createList, subscribe, unsubscribe } from "@/actions/curated-lists";
import type { CuratedListUiItem } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function ListsPageClient({ items }: { items: CuratedListUiItem[] }) {
  const { t } = useT();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  async function handleCreate() {
    if (!name.trim()) {
      setError(t("lists_error_create_name_required"));
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const created = await createList(name.trim(), description.trim() || null);
      setShowCreate(false);
      setName("");
      setDescription("");
      router.push(`/lists/${created.id}`);
    } catch {
      setError(t("lists_error_create"));
    } finally {
      setIsCreating(false);
    }
  }

  async function toggleSubscription(item: CuratedListUiItem) {
    setProcessingIds((prev) => new Set(prev).add(item.list.id));
    try {
      if (item.isSubscribed) await unsubscribe(item.list.id);
      else await subscribe(item.list.id);
      router.refresh();
    } catch {
      toast.error(t("lists_error_action"));
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.list.id);
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("lists_title")}</h1>
        <Button onClick={() => setShowCreate(true)}>{t("lists_new_title")}</Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("lists_empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.list.id}>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <Link href={`/lists/${item.list.id}`}>
                    <CardTitle className="hover:underline">{item.list.name}</CardTitle>
                  </Link>
                  {item.list.description && <p className="mt-1 text-sm text-muted-foreground">{item.list.description}</p>}
                </div>
                {item.isMine ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/lists/${item.list.id}`}>{t("lists_manage_button")}</Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={item.isSubscribed ? "outline" : "default"}
                    disabled={processingIds.has(item.list.id)}
                    onClick={() => toggleSubscription(item)}
                  >
                    {item.isSubscribed ? t("lists_unsubscribe_button") : t("lists_subscribe_button")}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t("lists_progress_format", item.ownedCount, item.totalCount)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("lists_new_title")}</DialogTitle>
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
              {t("lists_create_button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
