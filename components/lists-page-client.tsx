"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListChecks, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/locale-provider";
import { createList, subscribe, unsubscribe } from "@/actions/curated-lists";
import type { CuratedListUiItem } from "@/types/database";
import { Poster } from "@/components/movie/poster";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
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
      <PageHeader
        title={t("lists_title")}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus />
            {t("lists_new_title")}
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={t("lists_empty")}
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus />
              {t("lists_new_title")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.list.id}
              className="group flex gap-4 rounded-card border border-border/70 bg-card p-4 transition-colors hover:border-primary/40"
            >
              {/* Fanned poster stack: up to four films from the list. */}
              <Link href={`/lists/${item.list.id}`} className="relative h-32 w-28 shrink-0" aria-hidden tabIndex={-1}>
                {item.previewPosters.length === 0 ? (
                  <div className="flex size-full items-center justify-center rounded-lg bg-elevated">
                    <ListChecks className="size-6 text-muted-foreground/60" />
                  </div>
                ) : (
                  item.previewPosters
                    .slice(0, 3)
                    .reverse()
                    .map((poster, i, arr) => {
                      const depth = arr.length - 1 - i;
                      return (
                        <Poster
                          key={i}
                          path={poster.path}
                          title={poster.title}
                          size="xs"
                          className="absolute top-0 w-[4.5rem]"
                          style={{ left: depth * 14, transform: `rotate(${(depth - 1) * 4}deg)`, zIndex: 10 - depth }}
                        />
                      );
                    })
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/lists/${item.list.id}`} className="min-w-0">
                    <p className="font-display text-lg font-semibold leading-tight tracking-tight transition-colors hover:text-primary">
                      {item.list.name}
                    </p>
                  </Link>
                  {item.isMine ? (
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/lists/${item.list.id}`}>{t("lists_manage_button")}</Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={item.isSubscribed ? "secondary" : "default"}
                      disabled={processingIds.has(item.list.id)}
                      onClick={() => toggleSubscription(item)}
                    >
                      {item.isSubscribed ? t("lists_unsubscribe_button") : t("lists_subscribe_button")}
                    </Button>
                  )}
                </div>
                {item.list.description && <p className="line-clamp-2 text-sm text-muted-foreground">{item.list.description}</p>}
                <div className="mt-auto flex flex-col gap-1.5 pt-1">
                  <Progress value={item.ownedCount} max={item.totalCount} label={t("lists_progress_format", item.ownedCount, item.totalCount)} />
                  <p className="text-xs text-muted-foreground">{t("lists_progress_format", item.ownedCount, item.totalCount)}</p>
                </div>
              </div>
            </div>
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
